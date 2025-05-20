import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export const createOneProduct = async (data: any) => {
  let productData: any = {
    name: data.name,
    description: data.description,
    price: data.price,
    discount: data.discount,
    inventory: +data.inventory,
    
    category: {
      connectOrCreate: {
        where: {
          name: data.category,
        },
        create: {
          name: data.category,
        },
      },
    },
    type: {
      connectOrCreate: {
        where: {
          name: data.type,
        },
        create: {
          name: data.type,
        },
      },
    },
    images: {
        create: data.images
    }
  };

  if (data.tags && data.tags.length > 0) {
    productData.tags = {
      connectOrCreate: data.tags.map((tagName: string) => ({
        where: {
          name: tagName.trim(),
        },
        create: {
          name: tagName.trim(),
        },
      })),
    };
  }

  return prisma.product.create({
    data: productData
  });
};