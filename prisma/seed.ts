import { PrismaClient, CareTaskType, TaskVerifyType, PlantResourceType } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Start seeding...");

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@garden.com" },
    update: {},
    create: {
      email: "admin@garden.com",
      passwordHash: adminPassword,
      fullName: "System Admin",
      role: "ADMIN",
    },
  });
  console.log("✅ Admin account ensured:", admin.email);

  const farmerPassword = await bcrypt.hash("Farmer@123", 10);
  const farmer = await prisma.user.upsert({
    where: { email: "farmer@garden.com" },
    update: {},
    create: {
      email: "farmer@garden.com",
      passwordHash: farmerPassword,
      fullName: "Master Farmer",
      role: "FARMER",
    },
  });
  console.log("✅ Farmer account ensured:", farmer.email);

  // ── Flower Types ──────────────────────────────────────────────────────────
  const flowerTypes = [
    {
      name: "Hoa hướng dương",
      description: "Biểu tượng của sự lạc quan và năng lượng tích cực. Cây lớn lên theo ánh sáng mặt trời.",
      defaultDuration: 60,
    },
    {
      name: "Lavender",
      description: "Hương thơm dịu nhẹ giúp thư giãn tinh thần. Loài hoa của bình yên và tĩnh lặng.",
      defaultDuration: 45,
    },
    {
      name: "Hoa sen",
      description: "Vươn lên từ bùn lầy để nở rộ. Biểu tượng của sự kiên cường và thanh tịnh.",
      defaultDuration: 90,
    },
    {
      name: "Hoa hồng",
      description: "Đại diện cho tình yêu và sự chăm sóc. Nở rộ khi được yêu thương đúng cách.",
      defaultDuration: 75,
    },
    {
      name: "Sen đá",
      description: "Kiên nhẫn, bền bỉ trong điều kiện khó khăn. Đẹp giản dị và không cần nhiều.",
      defaultDuration: 30,
    },
  ];

  for (const ft of flowerTypes) {
    const existing = await prisma.flowerType.findUnique({ where: { name: ft.name } });
    if (!existing) {
      await prisma.flowerType.create({ data: ft });
      console.log(`✅ FlowerType created: ${ft.name}`);
    } else {
      console.log(`♻️  FlowerType exists: ${ft.name}`);
    }
  }

  // ── Garden + Real Plants (cần để user start virtual plant) ────────────────
  let garden = await prisma.garden.findFirst({ where: { farmerId: farmer.id } });
  if (!garden) {
    garden = await prisma.garden.create({
      data: {
        farmerId: farmer.id,
        name: "Vườn Xanh Bình Yên",
        address: "Đà Lạt, Lâm Đồng",
        description: "Vườn hoa tươi mát giữa khí hậu mát lạnh Đà Lạt",
        status: "APPROVED",
        isActive: true,
      },
    });
    console.log("✅ Garden created:", garden.name);
  } else {
    console.log("♻️  Garden exists:", garden.name);
  }

  // Tạo 3 cây thật cho mỗi loại hoa (tổng 15 cây)
  const allFlowerTypes = await prisma.flowerType.findMany();
  let realPlantCount = 0;
  for (const ft of allFlowerTypes) {
    for (let i = 1; i <= 3; i++) {
      const code = `${ft.name.toUpperCase().replace(/\s+/g, '-').substring(0, 10)}-00${i}`;
      const existing = await prisma.realPlant.findUnique({ where: { code } });
      if (!existing) {
        await prisma.realPlant.create({
          data: {
            code,
            status: "SEED",
            isAssigned: false,
            flowerTypeId: ft.id,
            gardenId: garden.id,
            plantedAt: new Date(),
          },
        });
        realPlantCount++;
      }
    }
  }
  if (realPlantCount > 0) console.log(`✅ ${realPlantCount} RealPlants created`);
  else console.log("♻️  RealPlants already exist");

  // ── Default Care Tasks ────────────────────────────────────────────────────
  const defaultTasks = [
    {
      title: "Uống một ly nước",
      description: "Hydrat hóa cơ thể là điều nhỏ bé nhưng ý nghĩa.",
      type: CareTaskType.DRINK_WATER,
      rewardResource: PlantResourceType.WATER,
      rewardAmount: 20,
      growthReward: 5,
      verifyType: TaskVerifyType.SELF_CONFIRM,
    },
    {
      title: "Thở chậm 1 phút",
      description: "Nhắm mắt, hít thở sâu và thả lỏng.",
      type: CareTaskType.BREATHING,
      rewardResource: PlantResourceType.AIR,
      rewardAmount: 15,
      growthReward: 8,
      verifyType: TaskVerifyType.TIMER,
      durationSeconds: 60,
    },
    {
      title: "Viết một dòng cảm xúc",
      description: "Một câu thôi cũng được. Hôm nay bạn cảm thấy thế nào?",
      type: CareTaskType.WRITE_JOURNAL,
      rewardResource: PlantResourceType.LOVE,
      rewardAmount: 25,
      growthReward: 10,
      verifyType: TaskVerifyType.SELF_CONFIRM,
    },
    {
      title: "Đi dạo 5 phút",
      description: "Bước ra ngoài một chút, hít thở không khí trong lành.",
      type: CareTaskType.SHORT_WALK,
      rewardResource: PlantResourceType.SUNLIGHT,
      rewardAmount: 20,
      growthReward: 12,
      verifyType: TaskVerifyType.TIMER,
      durationSeconds: 300,
    },
    {
      title: "Nghe nhạc thư giãn",
      description: "5 phút âm nhạc nhẹ nhàng giúp tinh thần dễ chịu hơn.",
      type: CareTaskType.LISTEN_SOUND,
      rewardResource: PlantResourceType.DEW,
      rewardAmount: 15,
      growthReward: 6,
      verifyType: TaskVerifyType.TIMER,
      durationSeconds: 300,
    },
    {
      title: "Tưới cây ảo",
      description: "Dành 1 phút chú ý đến cây ảo của bạn.",
      type: CareTaskType.WATER_PLANT,
      rewardResource: PlantResourceType.FERTILIZER,
      rewardAmount: 10,
      growthReward: 5,
      verifyType: TaskVerifyType.PHOTO_OPTIONAL,
    },
  ];

  for (const task of defaultTasks) {
    const existing = await prisma.careTask.findFirst({
      where: { title: task.title },
    });
    if (!existing) {
      await prisma.careTask.create({ data: { ...task, isDefault: true } });
      console.log(`✅ Task created: ${task.title}`);
    } else {
      await prisma.careTask.update({
        where: { id: existing.id },
        data: task,
      });
      console.log(`♻️  Task updated: ${task.title}`);
    }
  }

  console.log("🎉 Seeding completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });