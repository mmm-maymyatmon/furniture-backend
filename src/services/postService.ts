import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

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
