ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSKEY_FAILURE';
CREATE TABLE "passkey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "signCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "transports" JSONB,
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "aaguid" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "passkey_credentialId_key" ON "passkey"("credentialId");
CREATE INDEX "passkey_userId_revokedAt_idx" ON "passkey"("userId", "revokedAt");
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
