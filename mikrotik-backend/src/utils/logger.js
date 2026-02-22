const winston = require('winston');

// กำหนด Format ของ Log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // ดึง Stack trace มาด้วยถ้ามี error
  winston.format.json() // แปลงเป็น JSON เพื่อให้อ่านด้วยโปรแกรมจัดการ Log ได้ง่ายและปลอดภัย
);

const logger = winston.createLogger({
  // ถ้าเป็น Production จะโชว์แค่ warn กับ error (ซ่อน info และ debug)
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info', 
  format: logFormat,
  transports: [
    // แสดงผลออกทางหน้าจอ Console
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' 
        ? winston.format.json() // บน Production แสดงเป็น JSON ล้วนๆ
        : winston.format.combine(
            winston.format.colorize(), // บน Development ให้มีสีสันอ่านง่าย
            winston.format.printf(({ timestamp, level, message, stack }) => {
              return `[${timestamp}] ${level}: ${stack || message}`;
            })
          )
    }),
    // ตัวเลือกเพิ่มเติม: คุณสามารถเปิดคอมเมนต์ด้านล่างเพื่อบันทึก Error ลงไฟล์ได้
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' })
  ],
});

module.exports = logger;