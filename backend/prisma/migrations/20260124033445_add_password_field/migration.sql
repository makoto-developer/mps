-- AlterTable: Add password column with default value for existing users
ALTER TABLE "User" ADD COLUMN "password" TEXT;

-- Set default password hash for existing users (password: "changeme")
UPDATE "User" SET "password" = '$2b$10$i6CFf0mHeibP3NFWj8iLg.0i4bdF2D1ZahLRPXU/5D6REPLwhwwhm' WHERE "password" IS NULL;

-- Make password column required
ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;
