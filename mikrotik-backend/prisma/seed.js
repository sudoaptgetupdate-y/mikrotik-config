import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const genPorts = (etherCount, sfpCount, wlanCount, sfpPrefix = "sfp") => {
  const ports = [];
  for (let i = 1; i <= etherCount; i++) ports.push({ name: `ether${i}`, type: "ETHER" });
  for (let i = 1; i <= sfpCount; i++) ports.push({ name: `${sfpPrefix}${i}`, type: "SFP" });
  for (let i = 1; i <= wlanCount; i++) ports.push({ name: `wlan${i}`, type: "WLAN" });
  return ports;
};

const mikrotikModels = [
  { name: "hAP ac2 (RBD52G-5HacD2HnD-TC)", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1468_xl.webp", ports: genPorts(5, 0, 2) },
  { name: "hAP ax2 (C52iG-5HaxD2HaxD-TC)", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/2203_lg.webp", ports: genPorts(5, 0, 2) },
  { name: "hAP ax3 (C53UiG+5HPaxD2HPaxD)", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/2213_xl.webp", ports: genPorts(5, 0, 2) },
  { name: "hEX (RB750Gr3)", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1405_xl.webp", ports: genPorts(5, 0, 0) },
  { name: "L009UiGS-RM", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/2267_lg.webp", ports: genPorts(8, 1, 0) },
  { name: "L009UiGS-2HaxD-IN", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/2263_lg.webp", ports: genPorts(8, 1, 1) },
  { name: "RB2011UiAS-RM", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1505_lg.webp", ports: genPorts(10, 1, 0) },
  { name: "RB3011UiAS-RM", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1407_lg.webp", ports: genPorts(10, 1, 0) },
  { name: "RB4011iGS+RM", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1633_lg.webp", ports: genPorts(10, 1, 0, "sfp-sfpplus") },
  { name: "RB5009UG+S+IN", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/2065_lg.webp", ports: genPorts(8, 1, 0, "sfp-sfpplus") },
  { name: "CCR1009-7G-1C-1S+", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1228_lg.webp", ports: genPorts(7, 2, 0, "sfp-sfpplus") },
  { name: "CCR1016-12G", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1818_lg.webp", ports: genPorts(12, 0, 0) },
  { name: "CCR1036-12G-4S", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1820_lg.webp", ports: genPorts(12, 4, 0) },
  { name: "CCR1072-1G-8S+", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1055_lg.webp", ports: genPorts(1, 8, 0, "sfp-sfpplus") },
  { name: "CCR2004-16G-2S+", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/2563_lg.webp", ports: genPorts(16, 2, 0, "sfp-sfpplus") },
  { name: "CCR2116-12G-4S+", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/2115_lg.webp", ports: genPorts(13, 4, 0, "sfp-sfpplus") },
  { name: "RB1100AHx2", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/718_lg.webp", ports: genPorts(13, 0, 0) },
  { name: "RB1100AHx4", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1344_lg.webp", ports: genPorts(13, 0, 0) },
  { name: "RB1100AHx4 Dude Edition", imageUrl: "https://cdn.mikrotik.com/web-assets/rb_images/1285_lg.webp", ports: genPorts(13, 0, 0) }
];

const defaultSettings = [
  { key: 'MANAGEMENT_IPS', value: JSON.stringify(['10.234.56.0/24']), description: 'Networks allowed to access Router Management (Winbox/SSH)' },
  { key: 'MONITOR_IPS', value: JSON.stringify(['1.1.1.1', '8.8.8.8', '208.67.222.222', '9.9.9.9', '8.26.56.26']), description: 'Target IPs for PBR & Failover check-gateway (DO NOT remove any slots)' },
  { key: 'ROUTER_ADMINS', value: JSON.stringify([{ username: 'ntadmin', password: 'ntadmin_secure_password', group: 'full' }]), description: 'Default admin accounts created in MikroTik routers' },
  { key: 'AI_ENABLED', value: JSON.stringify('false'), description: 'Enable or disable AI Assistant (Ollama)' },
  { key: 'AI_OLLAMA_URL', value: JSON.stringify('http://192.168.191.241:11434'), description: 'Ollama Server URL' },
  { key: 'AI_OLLAMA_MODEL', value: JSON.stringify('qwen2.5:7b'), description: 'Ollama Model Name' },
  { key: 'AI_SYSTEM_PROMPT', value: JSON.stringify('คุณคือผู้เชี่ยวชาญด้าน Mikrotik และ Network Monitoring ของ NT (National Telecom) หน้าที่ของคุณคือตอบคำถามเกี่ยวกับสถานะอุปกรณ์ในเครือข่าย โดยใช้ข้อมูลที่ได้รับให้เกิดประโยชน์สูงสุด ตอบเป็นภาษาไทยที่กระชับ สุภาพ และเป็นกันเอง'), description: 'System Prompt for AI Assistant' }
];

async function main() {
  console.log('🌱 Start seeding System Settings...');
  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {}, // ไม่เปลี่ยนแปลงข้อมูลเดิมถ้ามี key นี้อยู่แล้ว
      create: setting,
    });
  }

  console.log('🌱 Start seeding Default Group...');
  const defaultGroup = await prisma.deviceGroup.findFirst({
    where: { name: 'All Devices' }
  });

  if (!defaultGroup) {
    await prisma.deviceGroup.create({
      data: {
        name: 'All Devices',
        description: 'กลุ่มพื้นฐานสำหรับอุปกรณ์ทั้งหมดที่ไม่ได้ระบุกลุ่ม',
        isNotifyEnabled: false
      }
    });
    console.log('✅ Created default group: All Devices');
  } else {
    console.log('⏭️ Default group "All Devices" already exists. Skipping...');
  }

  console.log('🌱 Start seeding Admin User...');
  const adminExists = await prisma.user.findFirst({ where: { username: "ntadmin" } });
  
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin", salt);

    await prisma.user.create({
      data: {
        username: "ntadmin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        firstName: "Super",
        lastName: "Admin",
        email: "admin@ntplcnst.com" 
      }
    });
    console.log('✅ Created default admin user (Username: ntadmin)');
  } else {
    console.log('⏭️ Admin user "ntadmin" already exists. Skipping...');
  }

  console.log('🌱 Start seeding MikroTik Routers Models...');
  for (const model of mikrotikModels) {
    const result = await prisma.deviceModel.upsert({
      where: { name: model.name },
      update: {
        imageUrl: model.imageUrl,
        ports: { deleteMany: {}, create: model.ports }
      },
      create: {
        name: model.name,
        imageUrl: model.imageUrl,
        ports: { create: model.ports }
      }
    });
  }
  console.log('✅ Synced router models completed.');
  
  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });