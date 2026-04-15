ALTER TABLE "users" ADD COLUMN "username" TEXT;

ALTER TABLE "bookings" ADD COLUMN "cancellation_reason" TEXT;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
