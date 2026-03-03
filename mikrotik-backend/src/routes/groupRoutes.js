const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// ✅ เปลี่ยนชื่อตรงนี้ให้ตรงกับใน authMiddleware.js ของคุณ
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// ทุก Route ต้อง Login ก่อน (เฉพาะ SUPER_ADMIN หรือ ADMIN เท่านั้นที่จัดการ Group ได้)
router.use(verifyToken);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

// CRUD สำหรับตัว Group
router.route('/')
  .get(groupController.getAllGroups)
  .post(groupController.createGroup);

router.route('/:id')
  .get(groupController.getGroupById)
  .put(groupController.updateGroup)
  .delete(groupController.deleteGroup);

// จัดการสมาชิก (อุปกรณ์) ใน Group
router.route('/:id/devices')
  .post(groupController.addDeviceToGroup); // เพิ่มอุปกรณ์เข้ากลุ่ม

router.route('/:id/devices/:deviceId')
  .delete(groupController.removeDeviceFromGroup); // เอาอุปกรณ์ออกจากกลุ่ม

module.exports = router;