-- AlterTable
ALTER TABLE "provider_payment_accounts"
ADD COLUMN "instructions" TEXT,
ADD COLUMN "method_type" TEXT;

UPDATE "provider_payment_accounts"
SET "method_type" = "institution",
    "instructions" = CASE
      WHEN "phone_number" IS NULL THEN 'Manual transfer to this account.'
      ELSE 'Manual transfer using phone number ' || "phone_number" || '.'
    END;

ALTER TABLE "provider_payment_accounts"
ALTER COLUMN "instructions" SET NOT NULL,
ALTER COLUMN "method_type" SET NOT NULL,
DROP COLUMN "institution",
DROP COLUMN "phone_number";

-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "business_name" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "id_image_data" BYTEA,
ADD COLUMN     "id_image_mime_type" TEXT,
ADD COLUMN     "license_number" TEXT,
ADD COLUMN     "owner_name" TEXT,
ADD COLUMN     "region" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "providers_license_number_key" ON "providers"("license_number");
