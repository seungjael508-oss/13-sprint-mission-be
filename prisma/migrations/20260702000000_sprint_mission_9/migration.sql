-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "userId" INTEGER;

INSERT INTO "User" ("email", "nickname", "password", "updatedAt")
SELECT 'system@panda.local', '시스템', 'not-used', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User")
  AND EXISTS (SELECT 1 FROM "Article");

-- Backfill a user for existing articles before enforcing ownership.
UPDATE "Article"
SET "userId" = (SELECT "id" FROM "User" ORDER BY "id" LIMIT 1)
WHERE "userId" IS NULL;

ALTER TABLE "Article" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ArticleComment" ADD COLUMN IF NOT EXISTS "userId" INTEGER;

INSERT INTO "User" ("email", "nickname", "password", "updatedAt")
SELECT 'system@panda.local', '시스템', 'not-used', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User")
  AND EXISTS (SELECT 1 FROM "ArticleComment");

UPDATE "ArticleComment"
SET "userId" = (SELECT "id" FROM "User" ORDER BY "id" LIMIT 1)
WHERE "userId" IS NULL;

ALTER TABLE "ArticleComment" ALTER COLUMN "userId" SET NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArticleLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "articleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductLike_userId_productId_key" ON "ProductLike"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArticleLike_userId_articleId_key" ON "ArticleLike"("userId", "articleId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLike" ADD CONSTRAINT "ProductLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLike" ADD CONSTRAINT "ProductLike_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
