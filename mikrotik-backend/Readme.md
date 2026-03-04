
[[1]] .env ฝั่ง Backend
DATABASE_URL="mysql://username:password@localhost:3306/db_name"
JWT_SECRET="long_key"
ENCRYPTION_KEY="long_key"
FRONTEND_URL="https://mikrotik.dashboard.com"
API_BASE_URL="https://mikrotik.dashboard.com"
PORT=3000


[[2]] app.js กรณีมี Coudflare proxy และมี reverse proxy
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
