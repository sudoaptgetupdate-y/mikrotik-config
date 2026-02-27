const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit');

const deviceRoutes = require('./routes/deviceRoutes'); 
const modelRoutes = require('./routes/modelRoutes');
const logRoutes = require('./routes/logRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const settingRoutes = require('./routes/settingRoutes');
require('./services/cronJobs');

const app = express();

    app.set('trust proxy', 1); 


// ==========================================
// 🛡️ 1. Security Headers (Helmet)
// ==========================================
app.use(helmet());

// ==========================================
// 🛡️ 2. CORS (Cross-Origin Resource Sharing)  <-- ย้ายขึ้นมาตรงนี้!
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

// ==========================================
// 🚦 Register Routes
// ==========================================
app.use('/api/devices', deviceRoutes);
app.use('/api/master', modelRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingRoutes);

// ==========================================
// 🛑 Base Route
// ==========================================
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

module.exports = app;