-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_lessonId_idx" ON "Booking"("lessonId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Lesson_date_idx" ON "Lesson"("date");

-- CreateIndex
CREATE INDEX "Lesson_classType_idx" ON "Lesson"("classType");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Oc1Request_userId_idx" ON "Oc1Request"("userId");

-- CreateIndex
CREATE INDEX "Oc1Request_lessonId_idx" ON "Oc1Request"("lessonId");

-- CreateIndex
CREATE INDEX "Oc1Request_status_idx" ON "Oc1Request"("status");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");
