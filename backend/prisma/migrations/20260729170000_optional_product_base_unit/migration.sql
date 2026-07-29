-- Allow quick product creation before unit setup.
ALTER TABLE "product" ALTER COLUMN "baseUnitId" DROP NOT NULL;
