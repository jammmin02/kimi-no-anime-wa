-- CreateTable
CREATE TABLE "recommendation_reasons" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "work_id" INTEGER NOT NULL,
    "input_signature" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_reasons_user_id_work_id_key" ON "recommendation_reasons"("user_id", "work_id");

-- AddForeignKey
ALTER TABLE "recommendation_reasons" ADD CONSTRAINT "recommendation_reasons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_reasons" ADD CONSTRAINT "recommendation_reasons_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;
