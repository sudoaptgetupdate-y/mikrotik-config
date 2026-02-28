-- CreateTable
CREATE TABLE `DeviceEventLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviceId` INTEGER NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `details` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DeviceEventLog_deviceId_idx`(`deviceId`),
    INDEX `DeviceEventLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DeviceEventLog` ADD CONSTRAINT `DeviceEventLog_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `ManagedDevice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
