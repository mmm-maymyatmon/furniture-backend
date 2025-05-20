import { prisma } from "./prismaClient";

export type PostArgs = {
  title: string;
  content: string;
  body: string;
  image: string;
  authorId: number;
  category: string;
  type: string;
  tags: string[];
};

export const createOnePost = async (postData: PostArgs) => {
  let data: any = {
    title: postData.title,
    content: postData.content,
    body: postData.body,
    image: postData.image,
    author: {
      connect: {
        id: postData.authorId,
      },
    },
    category: {
      connectOrCreate: {
        where: {
          name: postData.category,
        },
        create: {
          name: postData.category,
        },
      },
    },
    type: {
      connectOrCreate: {
        where: {
          name: postData.type,
        },
        create: {
          name: postData.type,
        },
      },
    },
  };

  if (postData.tags && postData.tags.length > 0) {
    data.tags = {
      connectOrCreate: postData.tags.map((tagName: string) => ({
        where: {
          name: tagName.trim(),
        },
        create: {
          name: tagName.trim(),
        },
      })),
    };
  }

  return prisma.post.create({
    data,
  });
};

export const getPostById = async(id: number)=> {
  return prisma.post.findUnique({
    where: {
      id
    }
  })
}

export const updateOnePost = async (postId: number, postData: PostArgs) => {
  const data: any = {
    title: postData.title,
    content: postData.content,
    body: postData.body,
    category: {
      connectOrCreate: {
        where: { name: postData.category },
        create: {
          name: postData.category,
        },
      },
    },
    type: {
      connectOrCreate: {
        where: { name: postData.type },
        create: {
          name: postData.type,
        },
      },
    },
  };

  if (postData.image) {
    data.image = postData.image;
  }

  if (postData.tags && postData.tags.length > 0) {
    data.tags = {
      set: [],
      connectOrCreate: postData.tags.map((tagName) => ({
        where: { name: tagName },
        create: {
          name: tagName,
        },
      })),
    };
  }

  return prisma.post.update({
    where: { id: postId },
    data,
  });
};

export const deleteOnePost = async (id: number) => {
  return prisma.post.delete({
    where: {
      id
    },
  });
};

export const getPostWithRelations = async (id: number) => {
  return prisma.post.findUnique({
    where: {
      id
    },
    select: {
      id: true,
      title: true,
      content: true,
      body: true,
      image: true,
      updatedAt: true,
      author: {
        select: {
          fullName: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
      type: {
        select: {
          name: true,
        },
      },
      tags: {
        select: {
          name: true,
        },
      },
    }
  });
};

export const getPostsList = async (options: any) => {
  return prisma.post.findMany(options)
}

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