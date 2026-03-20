// src/middlewares/errorMiddleware.js

const errorHandler = (err, req, res, next) => {
  // 1. Log error ไว้ดูฝั่ง Server (ถ้าคุณมีไฟล์ logger.js สามารถเปลี่ยนไปใช้ logger.error(err) ได้ครับ)
  console.error(`[Global Error] ${req.method} ${req.url} >> ${err.message}`);
  
  // 2. ดักจับ Error ปกติที่เราโยนมาจาก Service Layer (เช่น throw new Error("NOT_FOUND"))
  if (err.message.startsWith('CONFLICT')) {
    return res.status(409).json({ error: err.message.split(': ')[1] || "Conflict occurred" });
  }
  if (err.message === 'NOT_FOUND') {
    return res.status(404).json({ error: "Resource not found" });
  }
  if (err.message.startsWith('BAD_REQUEST')) {
    return res.status(400).json({ error: err.message.split(': ')[1] || "Bad request" });
  }
  if (err.message.startsWith('UNAUTHORIZED')) {
    return res.status(401).json({ error: err.message.split(': ')[1] || "Unauthorized" });
  }
  if (err.message.startsWith('FORBIDDEN')) {
    return res.status(403).json({ error: err.message.split(': ')[1] || "Access denied" });
  }

  // 3. ดักจับ Error จากฐานข้อมูล Prisma (เช่น ข้อมูลซ้ำ)
  if (err.code === 'P2002') {
    return res.status(400).json({ error: "Duplicate field value. This record already exists." });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: "Record not found in database." });
  }

  // 4. Default Error (ถ้าหลุดมาถึงตรงนี้ แปลว่าเป็น Bug ที่เราไม่ได้คาดคิด)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: "Internal Server Error",
    // ส่งรายละเอียด Error กลับไปเฉพาะตอนรันโหมด Development เท่านั้น (เพื่อความปลอดภัย)
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;