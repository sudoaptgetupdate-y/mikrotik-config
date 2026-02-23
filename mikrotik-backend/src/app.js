const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit');

const deviceRoutes = require('./routes/deviceRoutes'); 
const masterRoutes = require('./routes/masterRoutes');
const logRoutes = require('./routes/logRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
require('./services/cronJobs');

const app = express();
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', true); 
}
// ==========================================
// 🛡️ 1. Security Headers (Helmet)
// ==========================================
// Helmet จะช่วยปิดซ่อน Header บอกสถาปัตยกรรม (เช่น X-Powered-By: Express)
// และใส่ Header ป้องกัน XSS, Clickjacking, MIME sniffing ให้โดยอัตโนมัติ
app.use(helmet());

// ==========================================
// 🛡️ 2. Rate Limiting (จำกัดการยิง API รวม)
// ==========================================
// ป้องกันคนรันสคริปต์ยิง API รัวๆ จนเซิร์ฟเวอร์ทำงานหนัก (DoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // กรอบเวลา 15 นาที
  max: 200, // อนุญาตให้ 1 IP ยิงเข้ามาได้สูงสุด 200 ครั้ง ภายใน 15 นาที
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true, // ส่งข้อมูล Rate limit กลับไปใน Header ด้วย
  legacyHeaders: false,
});

// บังคับใช้ limiter เฉพาะกับเส้นทางที่ขึ้นต้นด้วย /api
app.use('/api', globalLimiter); 

// ==========================================
// 🛡️ 3. CORS (Cross-Origin Resource Sharing)
// ==========================================
// รับค่าจาก .env หรือใช้ค่าเริ่มต้น และเอาค่าที่เป็น undefined/null ออก
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // !origin อนุญาตให้ Postman หรือ Tool อื่นๆ ยิง API มาทดสอบได้
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`); // ช่วยเตือนใน Console ว่าโดเมนไหนโดนบล็อก
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // เพิ่ม OPTIONS สำหรับ Preflight request
  credentials: true,
};

app.use(cors(corsOptions));

// ==========================================
// 🛡️ 4. Body Parser & Payload Limit
// ==========================================
// ✅ แก้ไข: ลดขนาด limit จาก 10mb เป็น 500kb ป้องกันการยิง Payload ขนาดใหญ่ (DoS)
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// ==========================================
// 🚦 Register Routes
// ==========================================
app.use('/api/devices', deviceRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/auth', authRoutes);

// ==========================================
// 🛑 Base Route
// ==========================================
app.get('/', (req, res) => {
  // ✅ แก้ไข: เปลี่ยนการตอบกลับเพื่อไม่ให้แฮกเกอร์รู้ว่านี่คือระบบ MikroTik Cloud Controller (ลด Server Fingerprinting)
  res.status(200).send('OK');
});

module.exports = app;