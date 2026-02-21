-- AlterTable
ALTER TABLE `ManagedDevice` ADD COLUMN `ackAt` DATETIME(3) NULL,
    ADD COLUMN `ackByUserId` INTEGER NULL,
    ADD COLUMN `ackReason` VARCHAR(191) NULL,
    ADD COLUMN `isAcknowledged` BOOLEAN NOT NULL DEFAULT false;
