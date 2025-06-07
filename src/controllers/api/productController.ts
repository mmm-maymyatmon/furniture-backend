import { Request, Response, NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";
import { errorCode } from "../../../config/errorCode";
import { getUserById } from "../../services/authService";
import { checkUserIfNotExist } from "../../utils/auth";
import {
  getPostById,
  getPostWithRelations,
  getPostsList,
} from "../../services/postService";
import { createError } from "../../utils/error";
import { checkModelIfExist } from "../../utils/check";
import { title } from "process";
import { getOrSetCache } from "../../utils/cache";
import {
  getCategoryList,
  getProductsList,
  getProductWithRelations,
  getTypeList,
} from "../../services/productService";
import {
  addProductFavorite,
  removeProductFavorite,
} from "../../services/userService";
import { cache } from "sharp";
import cacheQueue from "../../jobs/queues/cacheQueue";

interface CustomRequest extends Request {
  userId?: number;
}

export const getProduct = [
  param("id", "Product ID is required").isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const productId = +req.params.id;
    const userId = req.userId;

    const user = await getUserById(userId!);
    checkUserIfNotExist(user);

    const cacheKey = `products:${JSON.stringify(productId)}`;
    const product = await getOrSetCache(cacheKey, async () => {
      return await getProductWithRelations(+productId, userId!);
    });
    checkModelIfExist(product);

    res.status(200).json({ message: "product Detail ", product });
  },
];

export const getProductsByPagination = [
  query("cursor", "Cursor must be Post ID.").isInt({ gt: 0 }).optional(),
  query("limit", "Limit number must be unsigned integer.")
    .isInt({ gt: 3 })
    .optional(),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }
    const lastCursor = req.query.cursor;
    const limit = req.query.limit || 5;
    const category = req.query.category;
    const type = req.query.type;

    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserIfNotExist(user);

    let categoryList: number[] = [];
    let typeList: number[] = [];

    if (category) {
      categoryList = category
        .toString()
        .split(",")
        .map((c) => Number(c))
        .filter((c) => c > 0);
    }
    if (type) {
      typeList = type
        .toString()
        .split(",")
        .map((t) => Number(t))
        .filter((t) => t > 0);
    }
    console.log("categoryList", categoryList);

    const where = {
      AND: [
        categoryList.length > 0 ? { categoryId: { in: categoryList } } : {},
        typeList.length > 0 ? { typeId: { in: typeList } } : {},
      ],
    };

    const options = {
      where,
      take: +limit + 1,
      skip: lastCursor ? 1 : 0,
      cursor: lastCursor ? { id: +lastCursor } : undefined,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        discount: true,
        status: true,
        images: {
          select: {
            id: true,
            path: true,
          },
          take: 1, // Get only the first image
        },
      },
      orderBy: {
        id: "desc",
      },
    };

    const cacheKey = `products:${JSON.stringify(req.query)}`;
    const products = await getOrSetCache(cacheKey, async () => {
      return await getProductsList(options);
    });

    const hasNextPage = products.length > +limit;

    if (hasNextPage) {
      products.pop();
    }

    const nextCursor =
      products.length > 0 ? products[products.length - 1].id : null;

    res.status(200).json({
      message: "Get all infinite products",
      nextCursor,
      prevCursor: lastCursor,
      products,
    });
  },
];

// export const getInfiniteProductsByPagination = [
//   query("cursor", "Cursor must be product ID.").isInt({ gt: 0 }).optional(),
//   query("limit", "Limit number must be unsigned integer.")
//     .isInt({ gt: 4 })
//     .optional(),
//   async (req: CustomRequest, res: Response, next: NextFunction) => {
//     const errors = validationResult(req).array({ onlyFirstError: true });
//     if (errors.length > 0) {
//       return next(createError(errors[0].msg, 400, errorCode.invalid));
//     }
//     const lastCursor = req.query.cursor;
//     const limit = req.query.limit || 5;

//     const userId = req.userId;
//     const user = await getUserById(userId!);
//     checkUserIfNotExist(user);

//     const options = {
//       take: +limit + 1,
//       skip: lastCursor ? 1 : 0,
//       cursor: lastCursor ? { id: +lastCursor } : undefined,
//       select: {
//         id: true,
//         title: true,
//         content: true,
//         image: true,
//         updatedAt: true,
//         author: {
//           select: {
//             fullName: true,
//           },
//         },
//       },
//       orderBy: {
//         id: "desc",
//       },
//     };
//     // const products = await getproductsList(options);
//     const cacheKey = `products:${JSON.stringify(req.query)}`;
//     const products = await getOrSetCache(cacheKey, async () => {
//       return await getproductsList(options);
//     });

//     const hasNextPage = products.length > +limit;

//     if (hasNextPage) {
//       products.pop();
//     }

//     const newCursor = products.length > 0 ? products[products.length - 1].id : null;

//     res.status(200).json({
//       message: "Get all infinite products",
//       products,
//       newCursor,
//       hasNextPage,
//     });
//   },
// ];

export const getCategoryType = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const user = await getUserById(userId!);
  checkUserIfNotExist(user);

  const categories = await getCategoryList();
  const types = await getTypeList();

  res.status(200).json({
    message: "Category & Types",
    categories,
    types,
  });
};

export const toggleFavorite = [
  body("productId", "Product ID must not be empty").isInt({ gt: 0 }).toInt(),
  body("favorite", "Favorite must be a boolean").isBoolean(),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    console.log("Request body:", req.body);

    const errors = validationResult(req).array({ onlyFirstError: true });
    console.log("Validation errors:", errors);

    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserIfNotExist(user);

    const { productId, favorite } = req.body;

    if (favorite) {
      await addProductFavorite(userId!, productId);
    } else {
      await removeProductFavorite(userId!, productId);
    }

    await cacheQueue.add(
      "invalidate-product-cache",
      { pattern: "products:*" },
      {
        jobId: `invalidate-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(200).json({
      message: favorite
        ? "Successfully added favorite"
        : "Successfully removed favorite",
    });
  },
];

