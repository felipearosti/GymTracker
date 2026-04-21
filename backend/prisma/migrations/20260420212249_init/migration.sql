-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "heightCm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "setsTarget" INTEGER NOT NULL,
    "repsMin" INTEGER NOT NULL,
    "repsMax" INTEGER NOT NULL,
    "restSeconds" INTEGER NOT NULL DEFAULT 90,
    "youtubeUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MuscleLoad" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "muscle" TEXT NOT NULL,
    "loadFactor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MuscleLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSet" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "rir" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "measurements" JSONB,
    "notes" TEXT,

    CONSTRAINT "BodyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "insights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workout_code_key" ON "Workout"("code");

-- CreateIndex
CREATE INDEX "Exercise_workoutId_idx" ON "Exercise"("workoutId");

-- CreateIndex
CREATE INDEX "MuscleLoad_muscle_idx" ON "MuscleLoad"("muscle");

-- CreateIndex
CREATE UNIQUE INDEX "MuscleLoad_exerciseId_muscle_key" ON "MuscleLoad"("exerciseId", "muscle");

-- CreateIndex
CREATE INDEX "Session_userId_startedAt_idx" ON "Session"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "SessionSet_sessionId_idx" ON "SessionSet"("sessionId");

-- CreateIndex
CREATE INDEX "SessionSet_exerciseId_completedAt_idx" ON "SessionSet"("exerciseId", "completedAt");

-- CreateIndex
CREATE INDEX "BodyMetric_userId_recordedAt_idx" ON "BodyMetric"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WeeklyReport_userId_weekStart_idx" ON "WeeklyReport"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuscleLoad" ADD CONSTRAINT "MuscleLoad_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMetric" ADD CONSTRAINT "BodyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
