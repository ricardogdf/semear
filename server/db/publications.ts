import type { Prisma, PublicationType, Visibility } from "@prisma/client";

import type { LikeState, Page, PublicationSnapshot } from "@/lib/utils";

import { prisma } from "./client";
import { DomainError } from "./errors";
import { authorSelect, mapAuthor, pageWindow, toPage } from "./mappers";
import { consumeRateLimit } from "./rate-limit";

const PUBLICATIONS_PER_HOUR = 30;
const LIKE_CHANGES_PER_HOUR = 600;
const PROFILE_PUBLICATIONS_LIMIT = 50;

export interface PublicationInput {
  type: PublicationType;
  title: string;
  authors: string;
  abstract: string;
  institution?: string | null;
  publishedOn?: string | null;
  externalUrl?: string | null;
  visibility: Visibility;
}

const publicationSelect = {
  id: true,
  type: true,
  title: true,
  authors: true,
  abstract: true,
  institution: true,
  publishedOn: true,
  externalUrl: true,
  visibility: true,
  createdAt: true,
  userId: true,
  user: { select: authorSelect },
  _count: { select: { likes: true } },
} satisfies Prisma.PublicationSelect;

type PublicationRow = Prisma.PublicationGetPayload<{ select: typeof publicationSelect }>;

/** Publicação visível na comunidade: pública e de uma conta ativa. */
const publicPublication = { visibility: "PUBLIC", user: { isActive: true } } satisfies Prisma.PublicationWhereInput;

/** Pública para todos; privada só para quem a cadastrou. */
function visibleTo(viewerId: string | null): Prisma.PublicationWhereInput {
  return { OR: [publicPublication, ...(viewerId ? [{ userId: viewerId }] : [])] };
}

async function likedAmong(viewerId: string | null, publicationIds: string[]) {
  if (!viewerId || publicationIds.length === 0) return new Set<string>();
  const rows = await prisma.publicationLike.findMany({
    where: { userId: viewerId, publicationId: { in: publicationIds } },
    select: { publicationId: true },
  });
  return new Set(rows.map((row) => row.publicationId));
}

async function toSnapshots(viewerId: string | null, rows: PublicationRow[]): Promise<PublicationSnapshot[]> {
  const liked = await likedAmong(
    viewerId,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    authors: row.authors,
    abstract: row.abstract,
    institution: row.institution,
    publishedOn: row.publishedOn?.toISOString().slice(0, 10) ?? null,
    externalUrl: row.externalUrl,
    visibility: row.visibility,
    createdAt: row.createdAt.toISOString(),
    owner: mapAuthor(row.user),
    likeCount: row._count.likes,
    likedByMe: liked.has(row.id),
    isOwner: row.userId === viewerId,
  }));
}

function toData(input: Partial<PublicationInput>): Prisma.PublicationUncheckedUpdateInput {
  const { publishedOn, ...rest } = input;
  return {
    ...rest,
    ...(publishedOn !== undefined ? { publishedOn: publishedOn ? new Date(`${publishedOn}T00:00:00Z`) : null } : {}),
  };
}

export async function createPublication(userId: string, input: PublicationInput) {
  await consumeRateLimit(
    `publication:user:${userId}`,
    PUBLICATIONS_PER_HOUR,
    60 * 60 * 1000,
    `Limite de ${PUBLICATIONS_PER_HOUR} cadastros de publicação por hora atingido.`,
  );
  const created = await prisma.publication.create({
    data: { ...(toData(input) as Prisma.PublicationUncheckedCreateInput), userId },
    select: publicationSelect,
  });
  return (await toSnapshots(userId, [created]))[0]!;
}

async function findOwned(userId: string, publicationId: string) {
  const found = await prisma.publication.findFirst({ where: { id: publicationId, userId }, select: { id: true } });
  if (!found) {
    throw new DomainError("NOT_FOUND", "Publicação não encontrada.");
  }
  return found;
}

export async function updatePublication(userId: string, publicationId: string, changes: Partial<PublicationInput>) {
  const target = await findOwned(userId, publicationId);
  const updated = await prisma.publication.update({
    where: { id: target.id },
    data: toData(changes),
    select: publicationSelect,
  });
  return (await toSnapshots(userId, [updated]))[0]!;
}

export async function deletePublication(userId: string, publicationId: string) {
  const deleted = await prisma.publication.deleteMany({ where: { id: publicationId, userId } });
  if (deleted.count === 0) {
    throw new DomainError("NOT_FOUND", "Publicação não encontrada.");
  }
}

/** Todas as publicações do próprio usuário (públicas e privadas), para gerenciar. */
export async function listOwnPublications(userId: string) {
  const rows = await prisma.publication.findMany({
    where: { userId },
    select: publicationSelect,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  return toSnapshots(userId, rows);
}

/** Publicações públicas exibidas no perfil de quem as cadastrou. */
export async function listProfilePublications(viewerId: string | null, ownerId: string) {
  const rows = await prisma.publication.findMany({
    where: { ...publicPublication, userId: ownerId },
    select: publicationSelect,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: PROFILE_PUBLICATIONS_LIMIT,
  });
  return toSnapshots(viewerId, rows);
}

export async function getPublication(viewerId: string | null, publicationId: string) {
  const row = await prisma.publication.findFirst({
    where: { id: publicationId, ...visibleTo(viewerId) },
    select: publicationSelect,
  });
  if (!row) {
    throw new DomainError("NOT_FOUND", "Publicação não encontrada ou não pública.");
  }
  return (await toSnapshots(viewerId, [row]))[0]!;
}

export async function listPublicPublications(
  viewerId: string,
  filters: { q: string; page: number },
): Promise<Page<PublicationSnapshot>> {
  const contains = { contains: filters.q, mode: "insensitive" as const };
  const rows = await prisma.publication.findMany({
    where: {
      ...publicPublication,
      ...(filters.q ? { OR: [{ title: contains }, { authors: contains }, { abstract: contains }] } : {}),
    },
    select: publicationSelect,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    ...pageWindow(filters.page),
  });
  return toPage(await toSnapshots(viewerId, rows), filters.page);
}

/**
 * Ranking: publicações públicas com ao menos uma curtida, da mais curtida para a menos curtida.
 * Cada usuário conta no máximo uma vez (chave composta). Empate: cadastro mais recente, depois id.
 */
export async function rankPublications(viewerId: string, page: number): Promise<Page<PublicationSnapshot>> {
  const rows = await prisma.publication.findMany({
    where: { ...publicPublication, likes: { some: {} } },
    select: publicationSelect,
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }, { id: "asc" }],
    ...pageWindow(page),
  });
  return toPage(await toSnapshots(viewerId, rows), page);
}

async function assertCanLike(userId: string, publicationId: string) {
  const visible = await prisma.publication.findFirst({
    where: { id: publicationId, ...visibleTo(userId) },
    select: { id: true },
  });
  if (!visible) {
    throw new DomainError("NOT_FOUND", "Publicação não encontrada ou não pública.");
  }
  await consumeRateLimit(
    `like:user:${userId}`,
    LIKE_CHANGES_PER_HOUR,
    60 * 60 * 1000,
    "Muitas curtidas em pouco tempo. Tente novamente mais tarde.",
  );
}

async function likeState(userId: string, publicationId: string): Promise<LikeState> {
  const [like, likeCount] = await Promise.all([
    prisma.publicationLike.findUnique({ where: { userId_publicationId: { userId, publicationId } }, select: { createdAt: true } }),
    prisma.publicationLike.count({ where: { publicationId } }),
  ]);
  return { liked: Boolean(like), likeCount };
}

/** Curte. Idempotente: a chave (usuário, publicação) impede curtidas duplicadas, inclusive simultâneas. */
export async function likePublication(userId: string, publicationId: string) {
  await assertCanLike(userId, publicationId);
  await prisma.publicationLike.createMany({ data: [{ userId, publicationId }], skipDuplicates: true });
  return likeState(userId, publicationId);
}

/** Remove a curtida. Idempotente: repetir não altera a contagem. */
export async function unlikePublication(userId: string, publicationId: string) {
  await assertCanLike(userId, publicationId);
  await prisma.publicationLike.deleteMany({ where: { userId, publicationId } });
  return likeState(userId, publicationId);
}
