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
    // 1. ตรวจสอบว่าเป็น Error จาก Zod หรือไม่
    if (err.name === 'ZodError' || err.errors) {
      // แนะนำให้ใช้ err.issues แทน err.errors เพื่อความชัวร์ (Zod เก็บข้อมูลจริงไว้ที่ issues)
      const issues = err.issues || err.errors;
      const errorMessages = issues.map((e) => {
        // ป้องกันกรณีที่ e.path ไม่มีค่า
        const fieldName = e.path.length > 0 ? e.path[e.path.length - 1] : 'unknown';
        return `${fieldName}: ${e.message}`;
      }).join(', ');
      
      // 2. ตอบกลับไปยัง Frontend ด้วย 400 Bad Request (ดีกว่าการโยนเข้า Global Error)
      return res.status(400).json({ 
        success: false, 
        message: `BAD_REQUEST: ข้อมูลไม่ถูกต้อง - ${errorMessages}` 
      });
    }

    // 3. ถ้าเป็น Error ระบบประเภทอื่นๆ ให้โยนเข้า Global Error Handler ตามปกติ
    next(err);
  }
};

module.exports = validate;