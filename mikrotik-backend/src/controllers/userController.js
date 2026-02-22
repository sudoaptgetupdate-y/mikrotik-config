const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Helper: ตรวจสอบความซับซ้อนของรหัสผ่าน
const validatePassword = (password) => {
  // ต้องมี: ตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่, ตัวเลข, อักขระพิเศษ และยาว >= 8 ตัว
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

// Helper: ตรวจสอบสิทธิ์ว่าสร้าง/แก้ไข Role นี้ได้ไหม
const canManageRole = (callerRole, targetRole) => {
  if (callerRole === 'SUPER_ADMIN') return true; // Super Admin ทำได้หมด
  if (callerRole === 'ADMIN' && targetRole === 'EMPLOYEE') return true; // Admin ทำได้แค่ Employee
  return false;
};

// 1. เพิ่มผู้ใช้ใหม่ (Create)
exports.createUser = async (req, res) => {
  try {
    const callerRole = req.user.role; // ดึง Role ของคนที่กดยิง API (ต้องมาจาก Middleware)
    const { firstName, lastName, email, role, password } = req.body;

    // 1.1 เช็คสิทธิ์การเพิ่ม
    if (!canManageRole(callerRole, role)) {
      return res.status(403).json({ error: "You don't have permission to create a user with this role." });
    }

    // 1.2 ตรวจสอบ Password
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character." 
      });
    }

    // 1.3 สร้าง Username จาก Email (เอาเฉพาะด้านหน้า @)
    let generatedUsername = email.split('@')[0];
    
    // เช็คว่า Username ซ้ำไหม (ถ้ามีคนชื่อเหมือนกันแต่อยู่คนละโดเมนอีเมล)
    const existingUser = await prisma.user.findUnique({ where: { username: generatedUsername } });
    if (existingUser) {
        generatedUsername = `${generatedUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 1.4 เข้ารหัสรหัสผ่าน (Hash)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1.5 บันทึกลงฐานข้อมูล
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        username: generatedUsername,
        password: hashedPassword,
        role
      }
    });

    // ลบรหัสผ่านออกก่อนส่งกลับไปแสดงผล
    delete newUser.password;
    res.status(201).json({ message: "User created successfully", user: newUser });

  } catch (error) {
    if (error.code === 'P2002' && error.meta.target.includes('email')) {
      return res.status(400).json({ error: "This email is already registered." });
    }
    logger.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

// 2. ดึงข้อมูลผู้ใช้ทั้งหมด (Read)
exports.getUsers = async (req, res) => {
  try {
    const callerRole = req.user.role;
    
    // ถ้าเป็น ADMIN ให้เห็นแค่ EMPLOYEE / ถ้าเป็น SUPER_ADMIN เห็นหมด
    const roleFilter = callerRole === 'ADMIN' ? { role: 'EMPLOYEE' } : {};

    const users = await prisma.user.findMany({
      where: roleFilter,
      select: {
        id: true, firstName: true, lastName: true, email: true, username: true, role: true, createdAt: true
      }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// ✅ 1. ฟังก์ชันดึงข้อมูล Profile ของตัวเอง
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, username: true, firstName: true, lastName: true, email: true, role: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // 🛡️ ตรวจสอบสิทธิ์: ถ้าไม่ได้ดูข้อมูลตัวเอง ต้องเช็คว่ามีสิทธิ์ดูข้อมูลของคนนี้หรือไม่
    if (req.user.id !== user.id) {
      if (!canManageRole(req.user.role, user.role)) {
        return res.status(403).json({ error: "Access denied. You don't have permission to view this profile." });
      }
    }

    res.json(user);
  } catch (error) {
    logger.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
};

// ✅ 2. ปรับปรุงฟังก์ชันอัปเดต ให้คนทั่วไปแก้ Profile/Password ตัวเองได้
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, currentPassword, newPassword, role, status } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const isUpdatingSelf = req.user.id === targetUser.id;

    // 🛡️ ตรวจสอบสิทธิ์ 1: ถ้าไม่ได้แก้ข้อมูลตัวเอง ต้องมีสิทธิ์จัดการคนๆ นี้
    if (!isUpdatingSelf) {
      if (!canManageRole(req.user.role, targetUser.role)) {
        return res.status(403).json({ error: "Access denied. You don't have permission to update this user." });
      }
    }

    let updateData = { firstName, lastName };

    // จัดการเรื่องรหัสผ่าน
    if (newPassword) {
      if (!validatePassword(newPassword)) {
        return res.status(400).json({ 
          error: "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character." 
        });
      }

      // 🛡️ ตรวจสอบรหัสผ่านเดิมเสมอเมื่อมีการขอเปลี่ยนรหัสผ่าน
      if (!currentPassword) {
         return res.status(400).json({ error: "Current password is required" });
      }
      const isMatch = await bcrypt.compare(currentPassword, targetUser.password);
      if (!isMatch) {
         return res.status(400).json({ error: "Incorrect current password" });
      }
      
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
    }

    // 🛡️ ตรวจสอบสิทธิ์ 2: การจัดการ Role และ Status
    if (role || status) {
      // ห้ามไม่ให้ใครก็ตามเปลี่ยน Role ของตัวเอง (ป้องกัน Employee แอบอัปเกรดตัวเองเป็น Admin)
      if (isUpdatingSelf && role && role !== targetUser.role) {
        return res.status(403).json({ error: "You cannot change your own role." });
      }

      // ถ้าคนอื่นแก้ให้ ต้องตรวจสอบว่าผู้แก้มีสิทธิ์กำหนด Role ระดับใหม่นี้หรือไม่
      if (role && role !== targetUser.role) {
        if (!canManageRole(req.user.role, role)) {
          return res.status(403).json({ error: "You don't have permission to assign this role." });
        }
        updateData.role = role;
      }

      // อัปเดตสถานะ (ถ้ามีการส่งมา)
      if (status) updateData.status = status;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, username: true, firstName: true, lastName: true, email: true, role: true }
    });

    res.json(updatedUser);
  } catch (error) {
    logger.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// 4. ลบผู้ใช้ (Delete)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const callerRole = req.user.role;

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    if (!canManageRole(callerRole, targetUser.role)) {
      return res.status(403).json({ error: "You don't have permission to delete this user." });
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};