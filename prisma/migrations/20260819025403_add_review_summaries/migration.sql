-- CreateEnum
CREATE TYPE "RatingBand" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "review_summaries" (
    "id" SERIAL NOT NULL,
    "work_id" INTEGER NOT NULL,
    "rating_band" "RatingBand" NOT NULL,
    "summary" TEXT NOT NULL,
    "review_count" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_summaries_work_id_rating_band_key" ON "review_summaries"("work_id", "rating_band");

-- AddForeignKey
ALTER TABLE "review_summaries" ADD CONSTRAINT "review_summaries_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;
