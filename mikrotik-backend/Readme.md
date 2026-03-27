
[[1]] .env ฝั่ง Backend
DATABASE_URL="mysql://username:password@localhost:3306/db_name"
JWT_SECRET="long_key"
ENCRYPTION_KEY="long_key"
FRONTEND_URL="https://mikrotik.dashboard.com"
API_BASE_URL="https://mikrotik.dashboard.com"
PORT=3000


[[2]] app.js กรณีมี Coudflare proxy และมี reverse proxy และต้องการจำกัดการเข้าถึงหน้าเว็บเฉพาะ trust public ip แต่ยังคงอนุญาตให้ mikrotik client ยิง Api มายัง path ของ hearbeat ได้

🛠️ ขั้นตอนที่ 1: แก้ไขไฟล์ที่ Reverse Proxy (192.168.191.80)
ไฟล์นี้คือหัวใจหลักในการทำ ACL ครับ ให้คุณเข้าไปแก้ไขไฟล์ /etc/nginx/sites-available/mikrotik-proxy (แก้ชื่อโดเมนและ IP ของคุณให้ถูกต้องด้วยนะครับ)
# 1. ระบุ IP Ranges ของ Cloudflare (เพื่อให้ Nginx รู้ว่าใครคือ IP จริง)
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;

real_ip_header CF-Connecting-IP;

server {
    server_name mikrotik.com; # 🟢 แก้เป็นโดเมนจริงของคุณ

    # 🟢 ส่วนที่ 1: อนุญาตให้ MikroTik ส่ง Heartbeat ได้จากทุกที่
    location /api/devices/heartbeat {
        allow all; 
        proxy_pass http://192.168.191.88;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 🔴 ส่วนที่ 2: จำกัดการเข้าถึงหน้าเว็บและ API ส่วนอื่นๆ 
    location / {
        allow 125.25.XX.XX;     # 🟢 1. ใส่ Public IP ของคุณ (หรือ IP ขาออกของ VPN)
        allow 192.168.191.0/24; # 🟢 2. อนุญาตวง Local ไว้ด้วย เผื่อคุณเข้ามาจัดการผ่านวงแลนตรงๆ
        deny all;               # 🔴 3. บล็อก IP อื่นทั้งหมด (ต้องอยู่บรรทัดสุดท้ายของกลุ่ม allow)
        
        proxy_pass http://192.168.191.88;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/mikrotik.com-0001/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/mikrotik.com-0001/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

# (ส่วน server 80 redirect to 443 ด้านล่าง คงไว้ตามเดิมของคุณได้เลยครับ)
บันทึกและตรวจสอบ Syntax ก่อน Restart:
Bash

sudo nginx -t
sudo systemctl restart nginx

🛠️ ขั้นตอนที่ 2: เช็คไฟล์ที่ Web Server (192.168.191.88)

เพื่อไม่ให้ IP จริงเพี้ยนเมื่อส่งมาถึง Web Server ให้เติม 2 บรรทัดนี้เข้าไปในไฟล์ /etc/nginx/sites-available/mikrotik ของ 191.88 ครับ
Nginx

server {
    listen 80;
    server_name _;

    # 🟢 เพิ่ม 2 บรรทัดนี้: รับ Real IP จากตัว Reverse Proxy (191.80)
    set_real_ip_from 192.168.191.80;
    real_ip_header X-Forwarded-For;

    location / {
        # ... (โค้ดเดิมของคุณ)
    }

    location /api/ {
        # ... (โค้ดเดิมของคุณ)
    }
}

บันทึกและ Restart Nginx ตัวที่สอง:
Bash

sudo nginx -t
sudo systemctl restart nginx

🛠️ ขั้นตอนที่ 3: เช็คไฟล์ Backend (app.js)

คุณทำส่วนนี้ไว้ดีแล้ว แค่แก้ไข trust proxy นิดเดียวเพื่อให้ Rate Limit ทำงานได้ถูกต้องที่สุดครับ

เข้าไปที่ไฟล์ app.js หาบรรทัด app.set('trust proxy', ...) แล้วแก้เป็น:
JavaScript

// 🌟 2. เชื่อใจ Reverse Proxy ภายในวงแลน
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal', '192.168.191.0/24']);

จากนั้น Restart Backend ครับ:
Bash

pm2 restart all

-------------------------------------------

[[3]] การตั้งค่าขนาดการอัพโหลดรูปภาพ (Image Upload Size)

หากต้องการเพิ่มขีดจำกัดการอัพโหลดรูปภาพ (เช่น 5MB) ต้องตั้งค่าทั้ง 3 ส่วนดังนี้:

🛠️ ส่วนที่ 1: เครื่อง Reverse Proxy (ด่านแรก)
แก้ไขไฟล์ Nginx ในเครื่องที่รับ Traffic จากภายนอก เพิ่ม `client_max_body_size` ใน `server` block:
Nginx
server {
    server_name yourdomain.com;
    client_max_body_size 5M; # ✅ อนุญาตให้ส่งไฟล์ขนาด 5MB ผ่าน Proxy ได้
    
    # ... config อื่นๆ ...
}

🛠️ ส่วนที่ 2: เครื่อง Web Server (เครื่องที่รัน Backend)
แก้ไขไฟล์ Nginx ในเครื่องที่รัน Node.js เพิ่ม `client_max_body_size` ใน `location /api/`:
Nginx
server {
    # ...
    location /api/ {
        client_max_body_size 5M; # ✅ อนุญาตให้ API รับไฟล์ขนาด 5MB
        proxy_pass http://localhost:3000/api/;
        # ...
    }
}

🛠️ ส่วนที่ 3: Backend (app.js)
ตรวจสอบให้แน่ใจว่า Body Parser ใน `app.js` รองรับขนาดที่ต้องการ:
JavaScript
// 🛡️ 4. Body Parser & Payload Limit
app.use(express.json({ limit: '5MB' }));
app.use(express.urlencoded({ extended: true, limit: '5MB' }));

และตรวจสอบขีดจำกัดใน `multer` (เช่นใน `src/routes/articleRoutes.js`):
JavaScript
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // ✅ 5MB
  // ...
});

บันทึกและตรวจสอบ Syntax Nginx ก่อน Restart เสมอ:
Bash
sudo nginx -t
sudo systemctl reload nginx