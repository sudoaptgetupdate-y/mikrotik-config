const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit');

const deviceRoutes = require('./routes/deviceRoutes'); 
const masterRoutes = require('./routes/masterRoutes');
const logRoutes = require('./routes/logRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const settingRoutes = require('./routes/settingRoutes');
require('./services/cronJobs');

const app = express();
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', true); 
}

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
// 🛡️ 3. Rate Limiting (จำกัดการยิง API รวม) <-- ย้ายลงมาตรงนี้!
// ==========================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // กรอบเวลา 15 นาที
  max: 200, // อนุญาตให้ 1 IP ยิงเข้ามาได้สูงสุด 200 ครั้ง ภายใน 15 นาที
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
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
app.use('/api/master', masterRoutes);
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