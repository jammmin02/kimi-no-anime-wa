-- CreateTable
CREATE TABLE "ranking_snapshots" (
    "id" SERIAL NOT NULL,
    "work_id" INTEGER NOT NULL,
    "type" "WorkType" NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ranking_snapshots_type_snapshot_date_idx" ON "ranking_snapshots"("type", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_snapshots_work_id_snapshot_date_key" ON "ranking_snapshots"("work_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "ranking_snapshots" ADD CONSTRAINT "ranking_snapshots_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;
