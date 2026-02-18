/*
  Warnings:

  - The values [DOWNLOAD_CONFIG,UPDATE_PROFILE] on the enum `ActivityLog_action` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `updatedAt` on the `Config` table. All the data in the column will be lost.
  - The values [SFP_PLUS,QSFP,LTE] on the enum `PortTemplate_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `ActivityLog` MODIFY `action` ENUM('LOGIN', 'LOGOUT', 'CREATE_DEVICE', 'UPDATE_DEVICE', 'DELETE_DEVICE', 'GENERATE_CONFIG') NOT NULL;

-- AlterTable
ALTER TABLE `Config` DROP COLUMN `updatedAt`,
    ADD COLUMN `managedDeviceId` INTEGER NULL,
    MODIFY `generatedScript` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `PortTemplate` MODIFY `type` ENUM('ETHER', 'SFP', 'WLAN') NOT NULL DEFAULT 'ETHER';

-- CreateIndex
CREATE INDEX `Config_managedDeviceId_idx` ON `Config`(`managedDeviceId`);

-- AddForeignKey
ALTER TABLE `Config` ADD CONSTRAINT `Config_managedDeviceId_fkey` FOREIGN KEY (`managedDeviceId`) REFERENCES `ManagedDevice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
