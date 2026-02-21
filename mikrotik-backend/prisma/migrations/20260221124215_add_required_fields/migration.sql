/*
  Warnings:

  - You are about to alter the column `role` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- 1. เพิ่ม Column โดยใส่ค่า Default ชั่วคราวลงไปก่อน (เพื่อให้แถวเก่ามีค่า)
ALTER TABLE `User` 
    ADD COLUMN `email` VARCHAR(191) NOT NULL DEFAULT 'temporary@mail.com',
    ADD COLUMN `firstName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `lastName` VARCHAR(191) NOT NULL DEFAULT '',
    MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE';

-- 2. (สำคัญ) สั่งถอด Default ออก เพื่อให้ในอนาคตถ้า Insert ใหม่แล้วไม่ส่งค่ามา มันจะ Error ตามที่เราต้องการ
ALTER TABLE `User` 
    ALTER COLUMN `email` DROP DEFAULT,
    ALTER COLUMN `firstName` DROP DEFAULT,
    ALTER COLUMN `lastName` DROP DEFAULT;

-- 3. สร้าง Index ตามปกติ
CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);
