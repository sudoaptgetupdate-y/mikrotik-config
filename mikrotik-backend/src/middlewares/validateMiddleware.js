const validate = (schema) => (req, res, next) => {
  try {
    // ให้ Zod ตรวจสอบข้อมูลทั้ง body, query, params
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next(); // ถ้าข้อมูลถูกต้อง ให้ไปทำงานที่ Controller ต่อ
  } catch (err) {
    // ถ้าข้อมูลผิด (เช่น ลืมส่งชื่อ, อีเมลผิดรูปแบบ) ดึงข้อความแจ้งเตือนมารวมกัน
    const errorMessages = err.errors.map((e) => `${e.path[e.path.length - 1]}: ${e.message}`).join(', ');
    throw new Error(`BAD_REQUEST: ข้อมูลไม่ถูกต้อง - ${errorMessages}`);
  }
};

module.exports = validate;