const express = require('express');
const cors = require('cors');
const deviceRoutes = require('./routes/deviceRoutes'); 
const masterRoutes = require('./routes/masterRoutes');
const logRoutes = require('./routes/logRoutes')
require('./services/cronJobs');

const app = express();

// Middlewares
app.use(cors());

// ✅ แก้ไขตรงนี้: เพิ่ม limit เป็น 10mb เพื่อรองรับ Config Data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/logs', logRoutes);

// Default Route
app.get('/', (req, res) => {
  res.send('MikroTik Cloud Controller API is Ready!');
});

module.exports = app;