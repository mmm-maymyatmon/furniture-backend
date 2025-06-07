import { prisma } from "./prismaClient";

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

export const getProductById = async(id: number)=> {
  return prisma.product.findUnique({
    where: {
      id
    },
    include: {
      images: true,
    }
  })
}

export const updateOneProduct = async (productId: number, data: any) => {
  const productData: any = {
    name: data.name,
    description: data.description,
    price: data.price,
    discount: data.discount,
    inventory: data.inventory,
    category: {
      connectOrCreate: {
        where: { name: data.category },
        create: {
          name: data.category,
        },
      },
    },
    type: {
      connectOrCreate: {
        where: { name: data.type },
        create: {
          name: data.type,
        },
      },
    },
    
  };
  if (data.tags && data.tags.length > 0) {
    productData.tags = {
      set: [],
      connectOrCreate: data.tags.map((tagName: string) => ({
        where: { name: tagName },
        create: {
          name: tagName,
        },
      })),
    };
  }
  if ( data.images && data.images.length > 0) {
    productData.images = {
      deleteMany: {},
      create: data.images,
    };
    
  }
  return prisma.product.update({
    where: { id: productId },
    data: productData,
  });
}

export const deleteOneProduct = async (id: number) => {
  return prisma.product.delete({
    where: {
      id
    },
  });
};

export const getProductWithRelations = async (id: number, userId: number) => {
  return prisma.product.findUnique({
    where: {
      id,
    },
    omit: {
      categoryId: true,
      typeId: true,
      createdAt: true,
      updatedAt: true,
      
    },
    include: {
      images: {
        select: {
          id: true,
          path: true,
        },
      },
      // User relation is not directly accessible via 'user' in include; remove or correct as needed.
      // If you want to include the user who created the product, use the correct relation name as defined in your Prisma schema, e.g.:
      User: {
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      }
    },
  });
};

export const getProductsList = async (options: any) => {
  return prisma.product.findMany(options);
};

export const getCategoryList = async () => {
  return prisma.category.findMany();
};

export const getTypeList = async () => {
  return prisma.type.findMany();
};

