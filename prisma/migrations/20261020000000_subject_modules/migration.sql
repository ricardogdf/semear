-- Módulos dentro das matérias. Migração apenas aditiva: aulas e simulados existentes ficam
-- sem módulo (matéria completa) e os resultados antigos começam sem estatística por aula.

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "moduleId" TEXT;

-- AlterTable
ALTER TABLE "Simulation" ADD COLUMN     "moduleId" TEXT,
ADD COLUMN     "moduleTitle" TEXT;

-- AlterTable
ALTER TABLE "SimulationResult" ADD COLUMN     "contentStats" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "SubjectModule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubjectModule_subjectId_title_key" ON "SubjectModule"("subjectId", "title");

-- CreateIndex
CREATE INDEX "Content_moduleId_idx" ON "Content"("moduleId");

-- CreateIndex
CREATE INDEX "Simulation_moduleId_idx" ON "Simulation"("moduleId");

-- AddForeignKey
ALTER TABLE "SubjectModule" ADD CONSTRAINT "SubjectModule_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SubjectModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SubjectModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

