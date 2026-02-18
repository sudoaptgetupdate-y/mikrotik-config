const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Start seeding...')

  // ----------------------------------------------------
  // 1. สร้าง Default User (สำคัญ! ต้องมี user id:1)
  // ----------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'password123', // ในใช้งานจริงควรเข้ารหัส แต่ Dev ใช้แบบนี้ไปก่อน
      role: 'ADMIN'
    }
  })
  console.log(`- Created/Checked User: ${admin.username} (ID: ${admin.id})`)

  // ----------------------------------------------------
  // 2. สร้างรุ่น Device Models
  // ----------------------------------------------------
  
  // 2.1 รุ่น hEX (RB750Gr3)
  const hex = await prisma.deviceModel.upsert({
    where: { name: 'RB750Gr3 (hEX)' },
    update: {},
    create: {
      name: 'RB750Gr3 (hEX)',
      imageUrl: 'https://i.mt.lv/cdn/product_files/RB750Gr3_160325.png',
      ports: {
        create: [
          { name: 'ether1', type: 'ETHER', defaultRole: 'wan' },
          { name: 'ether2', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether3', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether4', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether5', type: 'ETHER', defaultRole: 'lan' },
        ],
      },
    },
  })
  console.log(`- Created/Updated: ${hex.name}`)

  // 2.2 รุ่น RB4011
  const rb4011 = await prisma.deviceModel.upsert({
    where: { name: 'RB4011iGS+RM' },
    update: {},
    create: {
      name: 'RB4011iGS+RM',
      imageUrl: 'https://i.mt.lv/cdn/product_files/RB4011iGSplusRM_180628.png',
      ports: {
        create: [
          { name: 'sfp-sfpplus1', type: 'SFP', defaultRole: 'wan' },
          { name: 'ether1', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether2', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether3', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether4', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether5', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether6', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether7', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether8', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether9', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether10', type: 'ETHER', defaultRole: 'lan' },
        ],
      },
    },
  })
  console.log(`- Created/Updated: ${rb4011.name}`)

   // 2.3 รุ่น hAP ax2
   const hapAx2 = await prisma.deviceModel.upsert({
    where: { name: 'hAP ax2' },
    update: {},
    create: {
      name: 'hAP ax2',
      imageUrl: 'https://i.mt.lv/cdn/product_files/C52iG-5HaxD2HaxD_221014.png',
      ports: {
        create: [
          { name: 'ether1', type: 'ETHER', defaultRole: 'wan' },
          { name: 'ether2', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether3', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether4', type: 'ETHER', defaultRole: 'lan' },
          { name: 'ether5', type: 'ETHER', defaultRole: 'lan' },
          { name: 'wifi1', type: 'WLAN', defaultRole: 'lan' },
          { name: 'wifi2', type: 'WLAN', defaultRole: 'lan' },
        ],
      },
    },
  })
  console.log(`- Created/Updated: ${hapAx2.name}`)

  console.log('✅ Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })