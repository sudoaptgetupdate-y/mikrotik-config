-- CreateIndex
CREATE INDEX `ActivityLog_createdAt_idx` ON `ActivityLog`(`createdAt`);

-- CreateIndex
CREATE INDEX `ActivityLog_action_idx` ON `ActivityLog`(`action`);
