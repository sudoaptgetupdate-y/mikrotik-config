const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // ✅ 1. เพิ่มการนำเข้า bcryptjs ตรงนี้
const prisma = new PrismaClient();

// 🛠️ Helper Function: สร้าง Port อัตโนมัติ
const genPorts = (etherCount, sfpCount, wlanCount, sfpPrefix = "sfp") => {
  const ports = [];
  for (let i = 1; i <= etherCount; i++) ports.push({ name: `ether${i}`, type: "ETHER" });
  for (let i = 1; i <= sfpCount; i++) ports.push({ name: `${sfpPrefix}${i}`, type: "SFP" });
  for (let i = 1; i <= wlanCount; i++) ports.push({ name: `wlan${i}`, type: "WLAN" });
  return ports;
};

// 📦 รายการ Hardware Models (เฉพาะ Routers)
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

async function main() {
  console.log('🌱 Start seeding MikroTik Routers Models...');
  
  // ✅ 2. เปลี่ยนให้ค้นหาชื่อ ntadmin แทน admin 
  const adminExists = await prisma.user.findFirst({ where: { username: "ntadmin" } });
  
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("nt@nks!234", salt);

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
  }

  for (const model of mikrotikModels) {
    const result = await prisma.deviceModel.upsert({
      where: { name: model.name },
      update: {
        imageUrl: model.imageUrl,
        ports: {
          deleteMany: {}, 
          create: model.ports
        }
      },
      create: {
        name: model.name,
        imageUrl: model.imageUrl,
        ports: {
          create: model.ports
        }
      }
    });
    console.log(`✅ Synced router model: ${result.name}`);
  }
  
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