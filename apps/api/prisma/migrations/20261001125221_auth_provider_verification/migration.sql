/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `providers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "verified_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "providers_phone_key" ON "providers"("phone");
