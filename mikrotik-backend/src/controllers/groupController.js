const groupService = require('../services/groupService');

exports.createGroup = async (req, res, next) => {
  try {
    const group = await groupService.createGroup(req.body);
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'ชื่อกลุ่มนี้มีอยู่แล้ว' });
    next(error);
  }
};

exports.getAllGroups = async (req, res, next) => {
  try {
    const groups = await groupService.getAllGroups();
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
};

exports.getGroupById = async (req, res, next) => {
  try {
    const group = await groupService.getGroupById(req.params.id);
    res.status(200).json({ success: true, data: group });
  } catch (error) {
    if (error.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: 'ไม่พบกลุ่มที่ระบุ' });
    next(error);
  }
};

exports.updateGroup = async (req, res, next) => {
  try {
    const group = await groupService.updateGroup(req.params.id, req.body);
    res.status(200).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

exports.deleteGroup = async (req, res, next) => {
  try {
    await groupService.deleteGroup(req.params.id);
    res.status(200).json({ success: true, message: 'ลบกลุ่มสำเร็จ' });
  } catch (error) {
    // ดักจับ Error ตอนที่มีอุปกรณ์ค้างอยู่ในกลุ่ม
    if (error.message === "GROUP_NOT_EMPTY") {
      return res.status(400).json({ 
        error: 'ไม่สามารถลบได้ เนื่องจากยังมีอุปกรณ์อยู่ในกลุ่มนี้' 
      });
    }
    
    // ดักจับ Error ตอนที่หากลุ่มไม่เจอ
    if (error.message === "GROUP_NOT_FOUND") {
      return res.status(404).json({ error: 'ไม่พบกลุ่มที่ต้องการลบ' });
    }
    
    next(error); // ถ้าเป็น Error อื่นๆ ค่อยส่งไป 500
  }
};

exports.addDeviceToGroup = async (req, res, next) => {
  try {
    const { deviceId } = req.body;
    await groupService.addDeviceToGroup(req.params.id, deviceId);
    res.status(200).json({ success: true, message: 'เพิ่มอุปกรณ์เข้ากลุ่มสำเร็จ' });
  } catch (error) {
    next(error);
  }
};

exports.removeDeviceFromGroup = async (req, res, next) => {
  try {
    const { deviceId } = req.params; // รับ deviceId มาจาก URL Path
    await groupService.removeDeviceFromGroup(req.params.id, deviceId);
    res.status(200).json({ success: true, message: 'นำอุปกรณ์ออกจากกลุ่มสำเร็จ' });
  } catch (error) {
    next(error);
  }
};