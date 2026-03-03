-- CreateTable
CREATE TABLE `DeviceGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `telegramBotToken` VARCHAR(191) NULL,
    `telegramChatId` VARCHAR(191) NULL,
    `isNotifyEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeviceGroup_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DeviceGroupToManagedDevice` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_DeviceGroupToManagedDevice_AB_unique`(`A`, `B`),
    INDEX `_DeviceGroupToManagedDevice_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_DeviceGroupToManagedDevice` ADD CONSTRAINT `_DeviceGroupToManagedDevice_A_fkey` FOREIGN KEY (`A`) REFERENCES `DeviceGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DeviceGroupToManagedDevice` ADD CONSTRAINT `_DeviceGroupToManagedDevice_B_fkey` FOREIGN KEY (`B`) REFERENCES `ManagedDevice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
