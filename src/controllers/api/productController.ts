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
import { getProductWithRelations } from "../../services/productService";

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
      return await getProductWithRelations(+productId);
    });
      checkModelIfExist(product);

    res.status(200).json({ message: "product Detail ", product });
  },
];

// //Offset Pagination
// export const getProductsByPagination = [
//   query("page", "Page number must be unsigned integer.")
//     .isInt({ gt: 0 })
//     .optional(),
//   query("limit", "Limit number must be unsigned integer.")
//     .isInt({ gt: 4 })
//     .optional(),
//   async (req: CustomRequest, res: Response, next: NextFunction) => {
//     const errors = validationResult(req).array({ onlyFirstError: true });
//     if (errors.length > 0) {
//       return next(createError(errors[0].msg, 400, errorCode.invalid));
//     }
//     const page = req.query.page || 1;
//     const limit = req.query.limit || 5;
//     const userId = req.userId;
//     const user = await getUserById(userId!);
//     checkUserIfNotExist(user);

//     const skip = (+page - 1) * +limit;
//     const options = {
//       skip,
//       take: +limit + 1,
//       select: {
//         id: true,
//         title: true,
//         content: true,
//         body: true,
//         image: true,
//         updatedAt: true,
//         author: {
//           select: {
//             fullName: true,
//           },
//         },
//       },
//       orderBy: {
//         updatedAt: "desc",
//       },
//     };
//     // const products = await getproductsList(options);
//     const cacheKey = `products:${JSON.stringify(req.query)}`;
//     const products = await getOrSetCache(cacheKey, async () => {
//       return await getproductsList(options);
//     });

//     const hasNextPage = products.length > +limit;

//     let nextPage: number | null = null;
//     const previousPage = +page !== 1 ? +page - 1 : null;

//     if (hasNextPage) {
//       products.pop();
//       nextPage = +page + 1;
//     }

//     res.status(200).json({
//       message: "Get all products",
//       currentPage: page,
//       hasNextPage,
//       previousPage,
//       nextPage,
//       products,
//     });
//   },
// ];

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
