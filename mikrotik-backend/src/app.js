const express = require('express');
const cors = require('cors');
const deviceRoutes = require('./routes/deviceRoutes'); 
const masterRoutes = require('./routes/masterRoutes');

const app = express();

// Middlewares
app.use(cors());

// ✅ แก้ไขตรงนี้: เพิ่ม limit เพื่อให้รับ Config ก้อนใหญ่ได้ (แก้ปัญหา Save ไม่ผ่าน)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/master', masterRoutes);

// Default Route
app.get('/', (req, res) => {
  res.send('MikroTik Cloud Controller API is Ready!');
});

module.exports = app;