-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN     "difficulty" "Difficulty" NOT NULL DEFAULT 'easy';
