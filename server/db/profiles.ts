import type { Prisma } from "@prisma/client";

import type { FollowState, OwnProfileSnapshot, Page, PublicProfileSnapshot, UserCardSnapshot } from "@/lib/utils";

import { prisma } from "./client";
import { DomainError } from "./errors";
import { listProfilePublications } from "./publications";
import { listProfileSubjects } from "./library";
import { authorSelect, mapAuthor, pageWindow, toPage } from "./mappers";
import { consumeRateLimit } from "./rate-limit";

const SEARCHES_PER_MINUTE = 60;
const FOLLOW_CHANGES_PER_HOUR = 300;

const ownProfileSelect = {
  id: true,
  name: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  institution: true,
  course: true,
} satisfies Prisma.UserSelect;

const userCardSelect = { ...authorSelect, _count: { select: { followers: true } } } satisfies Prisma.UserSelect;
type UserCardRow = Prisma.UserGetPayload<{ select: typeof userCardSelect }>;

/** Perfis visíveis: só de contas ativas (contas desativadas somem da comunidade). */
const activeUser = { isActive: true } satisfies Prisma.UserWhereInput;

/** Quais destes usuários o visitante segue, numa única consulta (sem uma consulta por item). */
async function followedAmong(viewerId: string | null, userIds: string[]) {
  if (!viewerId || userIds.length === 0) return new Set<string>();
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: userIds } },
    select: { followingId: true },
  });
  return new Set(rows.map((row) => row.followingId));
}

async function toUserCards(viewerId: string | null, rows: UserCardRow[]): Promise<UserCardSnapshot[]> {
  const followed = await followedAmong(
    viewerId,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    ...mapAuthor(row),
    followerCount: row._count.followers,
    isFollowing: followed.has(row.id),
    isSelf: row.id === viewerId,
  }));
}

export async function getOwnProfile(userId: string): Promise<OwnProfileSnapshot> {
  return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: ownProfileSelect });
}

/** Atualiza o perfil do usuário da sessão: não existe parâmetro de "outro usuário" (sem IDOR). */
export async function updateOwnProfile(
  userId: string,
  changes: Partial<Omit<OwnProfileSnapshot, "id" | "name">>,
): Promise<OwnProfileSnapshot> {
  return prisma.user.update({ where: { id: userId }, data: changes, select: ownProfileSelect });
}

/** Perfil público. Pode ser visto sem login, mas expõe apenas dados públicos e conteúdos públicos. */
export async function getPublicProfile(viewerId: string | null, userId: string): Promise<PublicProfileSnapshot> {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...activeUser },
    select: { ...userCardSelect, bio: true, _count: { select: { followers: true, following: true } } },
  });
  if (!user) {
    throw new DomainError("NOT_FOUND", "Perfil não encontrado.");
  }

  const [[card], subjects, publications] = await Promise.all([
    toUserCards(viewerId, [user]),
    listProfileSubjects(viewerId, user.id),
    listProfilePublications(viewerId, user.id),
  ]);

  return { ...card!, bio: user.bio, followingCount: user._count.following, subjects, publications };
}

/**
 * Pesquisa por nome público. Quem definiu um nome de exibição só é encontrado por ele, para que a
 * pesquisa não revele o nome da conta que a pessoa preferiu não mostrar.
 */
export async function searchUsers(
  viewerId: string,
  filters: { q: string; institution: string; course: string; page: number },
): Promise<Page<UserCardSnapshot>> {
  await consumeRateLimit(
    `search:user:${viewerId}`,
    SEARCHES_PER_MINUTE,
    60 * 1000,
    "Muitas pesquisas em pouco tempo. Aguarde um minuto e tente novamente.",
  );

  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const rows = await prisma.user.findMany({
    where: {
      ...activeUser,
      AND: [
        filters.q
          ? { OR: [{ displayName: contains(filters.q) }, { displayName: null, name: contains(filters.q) }] }
          : {},
        filters.institution ? { institution: contains(filters.institution) } : {},
        filters.course ? { course: contains(filters.course) } : {},
      ],
    },
    select: userCardSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    ...pageWindow(filters.page),
  });

  return toPage(await toUserCards(viewerId, rows), filters.page);
}

async function assertFollowTarget(followerId: string, targetId: string) {
  if (followerId === targetId) {
    throw new DomainError("VALIDATION", "Você não pode seguir a si mesmo.");
  }
  const target = await prisma.user.findFirst({ where: { id: targetId, ...activeUser }, select: { id: true } });
  if (!target) {
    throw new DomainError("NOT_FOUND", "Perfil não encontrado.");
  }
  await consumeRateLimit(
    `follow:user:${followerId}`,
    FOLLOW_CHANGES_PER_HOUR,
    60 * 60 * 1000,
    "Muitas alterações em pouco tempo. Tente novamente mais tarde.",
  );
}

async function followState(followerId: string, targetId: string): Promise<FollowState> {
  const [relation, followerCount] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetId } },
      select: { createdAt: true },
    }),
    prisma.follow.count({ where: { followingId: targetId } }),
  ]);
  return { isFollowing: Boolean(relation), followerCount };
}

/**
 * Segue um usuário. Idempotente: a chave composta do banco e o ON CONFLICT DO NOTHING
 * garantem uma única relação mesmo com requisições simultâneas.
 */
export async function followUser(followerId: string, targetId: string) {
  await assertFollowTarget(followerId, targetId);
  await prisma.follow.createMany({ data: [{ followerId, followingId: targetId }], skipDuplicates: true });
  return followState(followerId, targetId);
}

/** Deixa de seguir. Idempotente: repetir não altera nada. */
export async function unfollowUser(followerId: string, targetId: string) {
  await assertFollowTarget(followerId, targetId);
  await prisma.follow.deleteMany({ where: { followerId, followingId: targetId } });
  return followState(followerId, targetId);
}

/** Pessoas que o próprio usuário segue (a lista de terceiros não é consultável). */
export async function listFollowing(viewerId: string, page: number): Promise<Page<UserCardSnapshot>> {
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, following: activeUser },
    select: { following: { select: userCardSelect } },
    orderBy: [{ createdAt: "desc" }, { followingId: "asc" }],
    ...pageWindow(page),
  });
  return toPage(
    await toUserCards(
      viewerId,
      rows.map((row) => row.following),
    ),
    page,
  );
}

/** Ranking: perfis com mais seguidores (apenas quem tem ao menos um). Empate: ordem de cadastro. */
export async function rankProfiles(viewerId: string, page: number): Promise<Page<UserCardSnapshot>> {
  const rows = await prisma.user.findMany({
    where: { ...activeUser, followers: { some: {} } },
    select: userCardSelect,
    orderBy: [{ followers: { _count: "desc" } }, { createdAt: "asc" }, { id: "asc" }],
    ...pageWindow(page),
  });
  return toPage(await toUserCards(viewerId, rows), page);
}
