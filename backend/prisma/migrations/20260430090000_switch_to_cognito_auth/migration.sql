ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cognitoSub" TEXT;

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "passwordHash",
  DROP COLUMN IF EXISTS "isActive",
  DROP COLUMN IF EXISTS "activationToken",
  DROP COLUMN IF EXISTS "activationExpires";

DROP INDEX IF EXISTS "User_activationToken_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_cognitoSub_key" ON "User"("cognitoSub");
