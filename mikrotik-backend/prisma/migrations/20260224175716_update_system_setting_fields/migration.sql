/*
  Warnings:

  - Added the required column `updatedAt` to the `SystemSetting` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `SystemSetting` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;
