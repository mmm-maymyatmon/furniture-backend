import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { errorCode } from "../../../config/errorCode";
import { createError } from "../../utils/error";
import { getUserById } from "../../services/authService";
import { checkUserIfNotExist } from "../../utils/auth";
import { checkUploadFile } from "../../utils/check";
import ImageQueue from "../../jobs/queues/imageQueue";

interface CustomRequest extends Request {
  userId?: number;
}

export const createPost = [
  body("title", "Title is required").trim().notEmpty().escape(),
  body("content", "Content is required").trim().notEmpty().escape(),
  body("body", "Body is required").trim().notEmpty().escape(),
  body("category", "Category is required").trim().notEmpty().escape(),
  body("type", "Type is required").trim().notEmpty().escape(),
  body("tags", "Tag is invalid")
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value) {
        return value.split(",").filter((tag: string) => tag.trim() !== "");
      }
      return value;
    }),

  
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errorCode.invalid, 400, errors[0].msg));
    }
    const { title, content, body, category, type, tags } = req.body;
    const userId = req.userId;
      const image = req.file;
      const user = await getUserById(userId!);
      checkUserIfNotExist(user);
      checkUploadFile(image);

      const splitFileName = req.file?.filename.split(".")[0];

      await ImageQueue.add(
        "optimize-image",
        {
          filePath: req.file?.path,
          fileName: `${splitFileName}.webp`,
          width: 835,
          height: 577,
          quality: 100,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        }
      );


    res.status(200).json({ message: "Post created successfully." });
  },
];

export const updatePost = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({ message: "Post updated successfully." });
};

export const deletePost = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({ message: "Post deleted successfully." });
};
