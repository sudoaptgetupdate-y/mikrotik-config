const express = require('express');
const cors = require('cors');
const deviceRoutes = require('./routes/deviceRoutes'); 
const masterRoutes = require('./routes/masterRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Register Routes

app.use('/api/devices', deviceRoutes);
app.use('/api/master', masterRoutes);

// Default Route
app.get('/', (req, res) => {
  res.send('MikroTik Cloud Controller API is Ready!');
});

module.exports = app;