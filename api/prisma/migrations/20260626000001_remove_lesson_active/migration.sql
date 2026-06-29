-- Remove inactive lessons and all their associated records before dropping the column.
-- Lessons are now permanently deleted instead of soft-deleted.
DELETE FROM "Booking" WHERE "lessonId" IN (SELECT id FROM "Lesson" WHERE active = false);
DELETE FROM "Oc1Request" WHERE "lessonId" IN (SELECT id FROM "Lesson" WHERE active = false);
DELETE FROM "Lesson" WHERE active = false;

-- Drop the active column — no longer needed since deletion is permanent.
ALTER TABLE "Lesson" DROP COLUMN "active";
