const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Start seeding...')

  // 1. สร้างรุ่น hEX (RB750Gr3) - รุ่นยอดนิยมร้านกาแฟ
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

  // 2. สร้างรุ่น RB4011 - รุ่นยอดนิยมออฟฟิศ/หอพัก
  const rb4011 = await prisma.deviceModel.upsert({
    where: { name: 'RB4011iGS+RM' },
    update: {},
    create: {
      name: 'RB4011iGS+RM',
      imageUrl: 'https://i.mt.lv/cdn/product_files/RB4011iGSplusRM_180628.png',
      ports: {
        create: [
          { name: 'sfp-sfpplus1', type: 'SFP_PLUS', defaultRole: 'wan' },
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

   // 3. สร้างรุ่น hAP ax2 (C52iG-5HaxD2HaxD) - รุ่น Home Use มี WiFi
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
          { name: 'wifi1', type: 'WLAN', defaultRole: 'lan' }, // 5GHz
          { name: 'wifi2', type: 'WLAN', defaultRole: 'lan' }, // 2.4GHz
        ],
      },
    },
  })

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