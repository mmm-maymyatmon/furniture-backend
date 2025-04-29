import { PrismaClient, Prisma } from "../generated/prisma";
import * as bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export function createRandomUser() {
    return {
      phone: faker.phone.number({style: 'international'}),
      password: "",
      randToken: faker.internet.jwt(),
    };
  }
  
  export const users = faker.helpers.multiple(createRandomUser, {
    count: 10,
  });

// const userData: Prisma.UserCreateInput[] = [
//   {
//     phone: "1234567891",
//     password: "",
//     randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
//   },
//   {
//     phone: "1234567892",
//     password: "",
//     randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
//   },
//   {
//     phone: "1234567893",
//     password: "",
//     randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
//   },
//   {
//     phone: "1234567894",
//     password: "",
//     randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
//   },
//   {
//     phone: "1234567895",
//     password: "",
//     randToken: "sfrwerwehfdsaoiwr45345fndsapifoenwrew",
//   },
// ];

async function main() {
  console.log(`Starting seed...`);
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash("12345678", salt);
  for (const u of users) {
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
