// ==========================================
// 🚀 0. Async Error Handler (ต้องอยู่บนสุดเสมอ!)
// ==========================================
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// นำเข้า Routes
const deviceRoutes = require('./routes/deviceRoutes'); 
const modelRoutes = require('./routes/modelRoutes');
const groupRoutes = require('./routes/groupRoutes');
const logRoutes = require('./routes/logRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const settingRoutes = require('./routes/settingRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const articleRoutes = require('./routes/articleRoutes');
require('./services/cronJobs');

// นำเข้า Error Middleware
const errorHandler = require('./middlewares/errorMiddleware'); 

// ==========================================
// 🛡️ 1. CORS ตั้งค่า trust ให้กับทุก hop เพื่อให้ rate-limit เชื่อใน public ip ของ device ที่ยิง api มา
// ==========================================
const app = express();

// 🌟 1. เพิ่ม Middleware ดักจับ IP จริงจาก Cloudflare 
app.use((req, res, next) => {
  if (req.headers['cf-connecting-ip']) {
    // นำ IP จริงมาสวมทับ เพื่อให้ Express นำไปใช้งานต่อ
    req.headers['x-forwarded-for'] = req.headers['cf-connecting-ip'];
  }
  next();
});

// 🌟 2. เชื่อใจ Reverse Proxy ภายในวงแลนตามปกติ
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal', '192.168.191.0/24']);

// ==========================================
// 🛡️ 1. Security Headers (Helmet)
// ==========================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ==========================================
// 🛡️ 2. CORS (Cross-Origin Resource Sharing)
// ==========================================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`); 
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  credentials: true,
};

app.use(cors(corsOptions));

// ==========================================
// 🛡️ 3. Rate Limiting (จำกัดการยิง API รวม)
// ==========================================
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // ปรับลดกรอบเวลาเหลือแค่ 1 นาที (จากเดิม 15 นาที)
  max: 300, // ให้ยิงได้ 300 ครั้งต่อนาที (เฉลี่ย 5 ครั้งต่อวินาที เพียงพอสำหรับ Dashboard)
  message: { error: 'Too many requests from this IP, please try again after 1 minute' },
  standardHeaders: true, 
  legacyHeaders: false,
});

app.use('/api', globalLimiter);

// ==========================================
// 🛡️ 4. Body Parser & Payload Limit
// ==========================================
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cookieParser());

// ==========================================
// 🚦 Register Routes
// ==========================================
app.use('/api/devices', deviceRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/master', modelRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/articles', articleRoutes);

// ==========================================
// 🛑 Base Route
// ==========================================
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// ==========================================
// 🚨 Global Error Handler (ต้องอยู่ล่างสุดเสมอ! ก่อน module.exports)
// ==========================================
app.use(errorHandler);

module.exports = app;