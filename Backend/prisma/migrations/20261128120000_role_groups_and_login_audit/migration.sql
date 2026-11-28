ALTER TYPE "Role" ADD VALUE 'AIRES_ANALYST';
ALTER TYPE "Role" ADD VALUE 'QUEENS_GM';
ALTER TYPE "Role" ADD VALUE 'QUEENS_ANALYST';

CREATE TABLE "LoginSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER,
    "ipAddress" TEXT,
    "location" TEXT,
    "userAgent" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "deviceType" TEXT,
    "browserName" TEXT,
    "browserVersion" TEXT,

    CONSTRAINT "LoginSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginSession_userId_loginAt_idx" ON "LoginSession"("userId", "loginAt");
CREATE INDEX "LoginSession_loginAt_idx" ON "LoginSession"("loginAt");

ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
