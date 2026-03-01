const { z } = require('zod');

// กฎสำหรับรหัสผ่าน (ต้องมีพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข อักขระพิเศษ อย่างน้อย 8 ตัว)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ==========================================
// 1. Auth Schemas
// ==========================================
const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, "กรุณากรอก Username หรือ Email"),
    password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
  })
});

// ==========================================
// 2. User Schemas
// ==========================================
const createUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "กรุณากรอกชื่อจริง"),
    lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
    email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE']),
    password: z.string().regex(passwordRegex, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ")
  })
});

// ==========================================
// 3. Device Schemas
// ==========================================
const createDeviceSchema = z.object({
  body: z.object({
    name: z.string().min(1, "กรุณากรอกชื่ออุปกรณ์"),
    circuitId: z.string().optional(),
    configData: z.any().optional()
  })
});

// ==========================================
// 4. Model Schemas
// ==========================================
const createModelSchema = z.object({
  body: z.object({
    name: z.string().min(1, "กรุณากรอกชื่อฮาร์ดแวร์โมเดล"),
    imageUrl: z.string().url("URL รูปภาพไม่ถูกต้อง").optional().or(z.literal('')),
    ports: z.array(z.object({
      name: z.string(),
      type: z.string(),
      defaultRole: z.string()
    })).min(1, "ต้องมีพอร์ตอย่างน้อย 1 พอร์ต")
  })
});

module.exports = {
  loginSchema,
  createUserSchema,
  createDeviceSchema,
  createModelSchema
};