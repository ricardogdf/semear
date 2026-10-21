-- Perfis acadêmicos, seguidores, biblioteca pública (publicação e importação de matérias) e
-- publicações acadêmicas com curtidas. Migração apenas aditiva: as matérias existentes continuam
-- privadas e os perfis começam sem dados acadêmicos.

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('ARTICLE', 'TCC', 'THESIS', 'OTHER');

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "importedFromAuthorName" TEXT,
ADD COLUMN     "importedFromId" TEXT,
ADD COLUMN     "importedFromOwnerId" TEXT,
ADD COLUMN     "importedFromTitle" TEXT,
ADD COLUMN     "isImported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "course" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "institution" TEXT;

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "type" "PublicationType" NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "abstract" TEXT NOT NULL DEFAULT '',
    "institution" TEXT,
    "publishedOn" DATE,
    "externalUrl" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationLike" (
    "userId" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationLike_pkey" PRIMARY KEY ("userId","publicationId")
);

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "Publication_userId_idx" ON "Publication"("userId");

-- CreateIndex
CREATE INDEX "Publication_visibility_createdAt_idx" ON "Publication"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "PublicationLike_publicationId_idx" ON "PublicationLike"("publicationId");

-- CreateIndex
CREATE INDEX "Subject_importedFromId_idx" ON "Subject"("importedFromId");

-- CreateIndex
CREATE INDEX "Subject_visibility_publishedAt_idx" ON "Subject"("visibility", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_userId_importedFromId_key" ON "Subject"("userId", "importedFromId");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_importedFromId_fkey" FOREIGN KEY ("importedFromId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_importedFromOwnerId_fkey" FOREIGN KEY ("importedFromOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationLike" ADD CONSTRAINT "PublicationLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationLike" ADD CONSTRAINT "PublicationLike_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Regras de integridade garantidas pelo próprio banco (o Prisma não modela CHECK):
-- uma cópia importada nunca pode ser pública,
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_imported_is_private_check" CHECK (NOT "isImported" OR "visibility" = 'PRIVATE');
-- só cópias importadas apontam para um original,
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_import_origin_check" CHECK ("importedFromId" IS NULL OR "isImported");
-- e ninguém segue a si mesmo.
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_not_self_check" CHECK ("followerId" <> "followingId");
