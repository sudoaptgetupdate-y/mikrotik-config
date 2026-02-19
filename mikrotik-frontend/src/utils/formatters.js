export const formatUptime = (uptimeStr) => {
  if (!uptimeStr) return "N/A";
  
  // แปลง w (สัปดาห์) ให้กลายเป็นวัน
  let days = 0;
  const weeksMatch = uptimeStr.match(/(\d+)w/);
  const daysMatch = uptimeStr.match(/(\d+)d/);
  
  if (weeksMatch) days += parseInt(weeksMatch[1]) * 7;
  if (daysMatch) days += parseInt(daysMatch[1]);

  const hoursMatch = uptimeStr.match(/(\d+)h/);
  const minsMatch = uptimeStr.match(/(\d+)m/);

  const h = hoursMatch ? hoursMatch[1] : "0";
  const m = minsMatch ? minsMatch[1] : "0";

  // รูปแบบการแสดงผล
  if (days > 0) {
    return `${days} Days, ${h} Hrs`; // เช่น "14 Days, 2 Hrs"
  } else if (h > 0) {
    return `${h} Hrs, ${m} Mins`;    // เช่น "5 Hrs, 30 Mins"
  } else {
    return `${m} Mins`;              // เช่น "15 Mins" (เพิ่งรีบูต)
  }
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