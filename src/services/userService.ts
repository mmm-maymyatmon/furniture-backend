import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export const addProductFavorite = async (userId: number, productId: number) => {
    return prisma.user.update({
        where: {
           id: userId,
      },
        data: {
            products: {
                connect: {
                    id: productId,
                }
            }
        }
    })
};

export const removeProductFavorite = async (userId: number, productId: number) => {
    return prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            products: {
                disconnect: {
                    id: productId,
                }
            }
        }
    })
};