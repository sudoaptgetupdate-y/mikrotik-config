const crypto = require('crypto');

// 🔒 คีย์ลับ 32 ตัวอักษร (แนะนำให้เอาไปใส่ในไฟล์ .env ตอนขึ้น Production)
// ตัวอย่างใน .env: ENCRYPTION_KEY=YourSuperSecretKey32Characters!
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; 

// 🎯 กำหนด IV คงที่ (16 bytes) 
// การใช้ IV คงที่จะทำให้ Token ตัวเดิม ถูกเข้ารหัสออกมาเป็นหน้าตาเดิมเสมอ
// ทำให้เราสามารถเอา Token จากอุปกรณ์ มาเข้ารหัส แล้วเอาไปค้นหา (WHERE) ใน Database ได้
const FIXED_IV = Buffer.from('1234567890123456');

exports.encrypt = (text) => {
  if (!text) return text;
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), FIXED_IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

exports.decrypt = (text) => {
  if (!text) return text;
  try {
    // 🔙 เช็คเพื่อความเข้ากันได้กับของเก่า: ถ้าใน DB ของเดิมเป็น UUID เปล่าๆ (36 ตัวอักษร มีขีด) ให้คืนค่าเดิม
    if (text.length === 36 && text.includes('-')) return text;

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), FIXED_IV);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return text; // ถ้าถอดรหัสไม่ได้ (ข้อมูลผิดพลาด) ให้คืนค่าตั้งต้น
  }
};