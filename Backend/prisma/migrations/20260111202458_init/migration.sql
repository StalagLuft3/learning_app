-- CreateTable
CREATE TABLE "employees" (
    "employeeID" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("employeeID")
);

-- CreateTable
CREATE TABLE "assessments" (
    "assessmentID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "delivery_method" TEXT NOT NULL,
    "delivery_location" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "manager_ID" INTEGER NOT NULL,
    "max_score" INTEGER NOT NULL,
    "passing_score" INTEGER NOT NULL,
    "expiry" INTEGER,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("assessmentID")
);

-- CreateTable
CREATE TABLE "courses" (
    "courseID" SERIAL NOT NULL,
    "courseName" TEXT NOT NULL,
    "description" TEXT,
    "delivery_method" TEXT,
    "delivery_location" TEXT,
    "duration" DOUBLE PRECISION NOT NULL,
    "courseManagerID" INTEGER NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("courseID")
);

-- CreateTable
CREATE TABLE "employees_courses" (
    "employee_courseID" SERIAL NOT NULL,
    "employeeID" INTEGER NOT NULL,
    "courseID" INTEGER NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "recordDate" TEXT NOT NULL,

    CONSTRAINT "employees_courses_pkey" PRIMARY KEY ("employee_courseID")
);

-- CreateTable
CREATE TABLE "experience_templates" (
    "experience_templateID" SERIAL NOT NULL,
    "experienceDescription" TEXT NOT NULL,
    "minimumDuration" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "experience_templates_pkey" PRIMARY KEY ("experience_templateID")
);

-- CreateTable
CREATE TABLE "employees_assessments" (
    "employee_assessmentID" SERIAL NOT NULL,
    "employeeID" INTEGER NOT NULL,
    "assessmentID" INTEGER NOT NULL,
    "currentStatus" TEXT,
    "scoreAchieved" INTEGER,
    "recordDate" TEXT NOT NULL,

    CONSTRAINT "employees_assessments_pkey" PRIMARY KEY ("employee_assessmentID")
);

-- CreateTable
CREATE TABLE "employees_experiences" (
    "employee_experienceID" SERIAL NOT NULL,
    "experience_templateID" INTEGER,
    "experienceDescription" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "recordDate" TEXT NOT NULL,
    "employeeID" INTEGER NOT NULL,
    "employeeText" TEXT,
    "refereeID" INTEGER,
    "refereeText" TEXT,

    CONSTRAINT "employees_experiences_pkey" PRIMARY KEY ("employee_experienceID")
);

-- CreateTable
CREATE TABLE "feedback" (
    "feedbackID" SERIAL NOT NULL,
    "refererID" INTEGER NOT NULL,
    "refereeID" INTEGER NOT NULL,
    "employee_experienceID" INTEGER NOT NULL,
    "actioned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("feedbackID")
);

-- CreateTable
CREATE TABLE "pathways" (
    "pathwayID" SERIAL NOT NULL,
    "pathwayName" TEXT NOT NULL,
    "pathwayDescription" TEXT NOT NULL,
    "pathwayManagerID" INTEGER NOT NULL,
    "enrollment_status" TEXT,
    "some_numeric_value" INTEGER,
    "record_date" TIMESTAMP(3),

    CONSTRAINT "pathways_pkey" PRIMARY KEY ("pathwayID")
);

-- CreateTable
CREATE TABLE "pathways_assessments" (
    "pathway_assessmentID" SERIAL NOT NULL,
    "pathwayID" INTEGER,
    "assessmentID" INTEGER NOT NULL,

    CONSTRAINT "pathways_assessments_pkey" PRIMARY KEY ("pathway_assessmentID")
);

-- CreateTable
CREATE TABLE "pathways_courses" (
    "pathway_courseID" SERIAL NOT NULL,
    "pathwayID" INTEGER,
    "courseID" INTEGER NOT NULL,

    CONSTRAINT "pathways_courses_pkey" PRIMARY KEY ("pathway_courseID")
);

-- CreateTable
CREATE TABLE "pathways_employees" (
    "pathway_employeeID" SERIAL NOT NULL,
    "pathwayID" INTEGER,
    "employeeID" INTEGER NOT NULL,
    "recordDate" TEXT NOT NULL,

    CONSTRAINT "pathways_employees_pkey" PRIMARY KEY ("pathway_employeeID")
);

-- CreateTable
CREATE TABLE "pathways_experience_templates" (
    "pathway_experience_templateID" SERIAL NOT NULL,
    "pathwayID" INTEGER,
    "experience_templateID" INTEGER NOT NULL,

    CONSTRAINT "pathways_experience_templates_pkey" PRIMARY KEY ("pathway_experience_templateID")
);

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_manager_ID_fkey" FOREIGN KEY ("manager_ID") REFERENCES "employees"("employeeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_courseManagerID_fkey" FOREIGN KEY ("courseManagerID") REFERENCES "employees"("employeeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees_courses" ADD CONSTRAINT "employees_courses_employeeID_fkey" FOREIGN KEY ("employeeID") REFERENCES "employees"("employeeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees_courses" ADD CONSTRAINT "employees_courses_courseID_fkey" FOREIGN KEY ("courseID") REFERENCES "courses"("courseID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees_assessments" ADD CONSTRAINT "employees_assessments_assessmentID_fkey" FOREIGN KEY ("assessmentID") REFERENCES "assessments"("assessmentID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees_assessments" ADD CONSTRAINT "employees_assessments_employeeID_fkey" FOREIGN KEY ("employeeID") REFERENCES "employees"("employeeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees_experiences" ADD CONSTRAINT "employees_experiences_employeeID_fkey" FOREIGN KEY ("employeeID") REFERENCES "employees"("employeeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathways_assessments" ADD CONSTRAINT "pathways_assessments_assessmentID_fkey" FOREIGN KEY ("assessmentID") REFERENCES "assessments"("assessmentID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathways_assessments" ADD CONSTRAINT "pathways_assessments_pathwayID_fkey" FOREIGN KEY ("pathwayID") REFERENCES "pathways"("pathwayID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathways_courses" ADD CONSTRAINT "pathways_courses_courseID_fkey" FOREIGN KEY ("courseID") REFERENCES "courses"("courseID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathways_courses" ADD CONSTRAINT "pathways_courses_pathwayID_fkey" FOREIGN KEY ("pathwayID") REFERENCES "pathways"("pathwayID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathways_employees" ADD CONSTRAINT "pathways_employees_employeeID_fkey" FOREIGN KEY ("employeeID") REFERENCES "employees"("employeeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathways_employees" ADD CONSTRAINT "pathways_employees_pathwayID_fkey" FOREIGN KEY ("pathwayID") REFERENCES "pathways"("pathwayID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathways_experience_templates" ADD CONSTRAINT "pathways_experience_templates_experience_templateID_fkey" FOREIGN KEY ("experience_templateID") REFERENCES "experience_templates"("experience_templateID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathways_experience_templates" ADD CONSTRAINT "pathways_experience_templates_pathwayID_fkey" FOREIGN KEY ("pathwayID") REFERENCES "pathways"("pathwayID") ON DELETE CASCADE ON UPDATE CASCADE;
