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

// ตั้งค่า CORS (ตามที่คุณได้ทำไปแล้วในข้อ 2)
// ... (โค้ด CORS ของคุณ) ...
app.use(cors()); // สมมติว่าตั้งค่า Options ไปแล้ว

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('MikroTik Cloud Controller API is Ready!');
});

module.exports = app;