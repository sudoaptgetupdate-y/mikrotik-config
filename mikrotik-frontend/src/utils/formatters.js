export const formatUptime = (uptimeStr) => {
  if (!uptimeStr) return 'N/A';

  // ป้องกันกรณีส่งมาเป็นตัวเลขเพียวๆ (เผื่อไว้)
  if (!isNaN(uptimeStr)) {
    return `${uptimeStr} s`; 
  }

  // ตัวแปรเก็บค่าที่สกัดได้จาก String ของ MikroTik
  let weeks = 0, days = 0, hours = 0, minutes = 0;

  // ใช้ Regex ดึงตัวเลขที่อยู่หน้า w, d, h, m
  const wMatch = uptimeStr.match(/(\d+)w/);
  const dMatch = uptimeStr.match(/(\d+)d/);
  const hMatch = uptimeStr.match(/(\d+)h/);
  const mMatch = uptimeStr.match(/(\d+)m/);

  if (wMatch) weeks = parseInt(wMatch[1], 10);
  if (dMatch) days = parseInt(dMatch[1], 10);
  if (hMatch) hours = parseInt(hMatch[1], 10);
  if (mMatch) minutes = parseInt(mMatch[1], 10);

  // คำนวณวันรวม (สัปดาห์ * 7 + วัน)
  const totalDays = (weeks * 7) + days;

  // จัดรูปแบบการแสดงผลให้อ่านง่าย
  if (totalDays > 0) {
    return `${totalDays} Days, ${hours} Hrs`;
  }
  if (hours > 0) {
    return `${hours} Hrs, ${minutes} Mins`;
  }
  if (minutes > 0) {
    return `${minutes} Mins`;
  }
  
  return uptimeStr; // ถ้าต่ำกว่านาที ให้แสดงของเดิม (เช่น 45s)
};

// ฟังก์ชันแปลง Latency
export const formatLatency = (timeStr) => {
  if (!timeStr || timeStr === "timeout" || timeStr === "N/A") return "Timeout";
  
  // timeStr จะมาในรูปแบบ "00:00:00.015504"
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    
    // แปลงทุกอย่างเป็นมิลลิวินาที (ms)
    const totalMs = Math.round((h * 3600 + m * 60 + s) * 1000);
    return `${totalMs} ms`;
  }
  return timeStr; 
};