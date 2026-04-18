-- Contact: rename publication -> outlet, broaden nullability, add kind
ALTER TABLE "Contact" RENAME COLUMN "publication" TO "outlet";
ALTER TABLE "Contact" ALTER COLUMN "outlet" DROP NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "beat" DROP NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "tier" DROP NOT NULL;
ALTER TABLE "Contact" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'journalist';

-- SupplierContact: add notes
ALTER TABLE "SupplierContact" ADD COLUMN "notes" TEXT;

-- ClientContact: new table
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
