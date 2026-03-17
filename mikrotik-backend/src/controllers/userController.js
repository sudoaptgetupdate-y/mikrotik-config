const userService = require('../services/userService');
const logService = require('../services/logService');

exports.createUser = async (req, res) => {
  const newUser = await userService.createUser(req.user.role, req.body);
  
  await logService.createActivityLog({
    userId: req.user.id,
    action: 'CREATE_USER',
    details: `สร้างผู้ใช้งานใหม่: ${newUser.username} (${newUser.role})`,
    ipAddress: req.ip
  });

  res.status(201).json({ message: "User created successfully", user: newUser });
};

exports.getUsers = async (req, res) => {
  const users = await userService.getUsers(req.user.role);
  res.json(users);
};

exports.getUserById = async (req, res) => {
  const user = await userService.getUserById(req.params.id, req.user.id, req.user.role);
  res.json(user);
};

exports.updateUser = async (req, res) => {
  const oldUser = await userService.getUserById(req.params.id, req.user.id, req.user.role);
  const updatedUser = await userService.updateUser(req.params.id, req.user.id, req.user.role, req.body);
  
  // ตรวจสอบว่าเป็นกรณี Toggle Active/Inactive หรือไม่
  let action = 'UPDATE_USER';
  let details = `อัปเดตข้อมูลผู้ใช้งาน: ${updatedUser.username}`;

  if (req.body.hasOwnProperty('isActive') && oldUser.isActive !== req.body.isActive) {
    action = 'TOGGLE_USER_STATUS';
    details = `${req.body.isActive ? 'เปิดการใช้งาน' : 'ปิดการใช้งาน'} ผู้ใช้: ${updatedUser.username}`;
  }

  await logService.createActivityLog({
    userId: req.user.id,
    action,
    details,
    ipAddress: req.ip
  });

  res.json(updatedUser);
};

exports.deleteUser = async (req, res) => {
  const userToDelete = await userService.getUserById(req.params.id, 0, req.user.role); // 0 คือข้ามการเช็ค ID ตัวเอง
  await userService.deleteUser(req.params.id, req.user.role);
  
  await logService.createActivityLog({
    userId: req.user.id,
    action: 'DELETE_USER',
    details: `ลบผู้ใช้งาน (Archive): ${userToDelete.username}`,
    ipAddress: req.ip
  });

  res.json({ message: "User deleted successfully" });
};