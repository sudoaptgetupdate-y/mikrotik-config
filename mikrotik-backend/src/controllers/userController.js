const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

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
    console.error(error);
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

// 3. อัปเดตผู้ใช้ (Update)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const callerRole = req.user.role;
    const { firstName, lastName, role, password } = req.body; // ไม่ยอมให้แก้ Email/Username ได้ง่ายๆ

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // เช็คสิทธิ์ว่าอัปเดตคนนี้ได้ไหม
    if (!canManageRole(callerRole, targetUser.role)) {
      return res.status(403).json({ error: "You don't have permission to update this user." });
    }

    let updateData = { firstName, lastName };
    
    // ถ้ามีการส่ง Role มาแก้ และสิทธิ์ถึง
    if (role && canManageRole(callerRole, role)) {
        updateData.role = role;
    }

    // ถ้ามีการส่ง Password มาแก้
    if (password) {
      if (!validatePassword(password)) {
        return res.status(400).json({ error: "Password does not meet requirements." });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, firstName: true, lastName: true, email: true, username: true, role: true }
    });

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
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