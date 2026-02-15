-- CreateTable
CREATE TABLE `ManagedDevice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `circuitId` VARCHAR(191) NULL,
    `apiToken` VARCHAR(191) NOT NULL,
    `currentIp` VARCHAR(191) NOT NULL DEFAULT '127.0.0.1',
    `lastSeen` DATETIME(3) NULL,
    `pendingCmd` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ManagedDevice_apiToken_key`(`apiToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ManagedDevice` ADD CONSTRAINT `ManagedDevice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
