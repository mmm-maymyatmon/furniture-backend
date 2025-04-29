import { PrismaClient, Prisma } from "../generated/prisma";
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
  {
    phone: "1234567891",
    password: "",
    randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
  },
  {
    phone: "1234567892",
    password: "",
    randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
  },
  {
    phone: "1234567893",
    password: "",
    randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
  },
  {
    phone: "1234567894",
    password: "",
    randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
  },
  {
    phone: "1234567895",
    password: "",
    randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
  },
];

async function main() {
  console.log(`Starting seed...`);
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash("12345678", salt);
  for (const u of userData) {
    u.password = password;
    await prisma.user.create({ data: u });
  }
  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
