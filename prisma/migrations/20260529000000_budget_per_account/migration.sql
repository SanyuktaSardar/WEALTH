-- Drop old unique constraint on userId
DROP INDEX IF EXISTS "budgets_userId_key";

-- Delete existing budgets (they have no accountId yet — can't migrate safely)
DELETE FROM "budgets";

-- Add accountId column (NOT NULL after clearing rows)
ALTER TABLE "budgets" ADD COLUMN "accountId" TEXT NOT NULL;

-- Add unique constraint on accountId (one budget per account)
CREATE UNIQUE INDEX "budgets_accountId_key" ON "budgets"("accountId");

-- Add foreign key to accounts
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
