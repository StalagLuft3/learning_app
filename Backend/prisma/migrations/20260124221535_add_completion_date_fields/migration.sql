/*
  Warnings:

  - You are about to drop the column `scoreAchieved` on the `employees_assessments` table. All the data in the column will be lost.
*/
-- AlterTable
ALTER TABLE "employees_assessments" DROP COLUMN "scoreAchieved",
ADD COLUMN     "accreditationDate" TEXT,
ADD COLUMN     "completionDate" TEXT,
ADD COLUMN     "score" INTEGER;

-- AlterTable
ALTER TABLE "employees_courses" ADD COLUMN     "completionDate" TEXT,
ADD COLUMN     "score" INTEGER;

-- AddForeignKey
ALTER TABLE "employees_experiences" ADD CONSTRAINT "employees_experiences_refereeID_fkey" FOREIGN KEY ("refereeID") REFERENCES "employees"("employeeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathways" ADD CONSTRAINT "pathways_pathwayManagerID_fkey" FOREIGN KEY ("pathwayManagerID") REFERENCES "employees"("employeeID") ON DELETE RESTRICT ON UPDATE CASCADE;
