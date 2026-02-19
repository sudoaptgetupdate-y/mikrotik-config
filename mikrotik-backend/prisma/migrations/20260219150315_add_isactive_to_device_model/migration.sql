-- AlterTable
ALTER TABLE `DeviceModel` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `ManagedDevice` ADD COLUMN `latency` VARCHAR(191) NULL,
    ADD COLUMN `storage` INTEGER NULL DEFAULT 0,
    ADD COLUMN `temp` VARCHAR(191) NULL;
