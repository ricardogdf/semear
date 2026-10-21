-- Aulas marcadas como concluídas pelo usuário. Migração apenas aditiva: as aulas existentes começam não concluídas.

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "completedAt" TIMESTAMP(3);

