/*
  Warnings:

  - You are about to alter the column `ackReason` on the `ManagedDevice` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.

*/
-- AlterTable
ALTER TABLE `ManagedDevice` MODIFY `ackReason` JSON NULL;
