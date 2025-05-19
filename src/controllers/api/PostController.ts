import { Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import { errorCode } from "../../../config/errorCode";
import { getUserById } from "../../services/authService";
import { checkUserIfNotExist } from "../../utils/auth";
import { getPostById, getPostWithRelations } from "../../services/postService";
import { createError } from "../../utils/error";
import { checkModelIfExist } from "../../utils/check";
import { title } from "process";

interface CustomRequest extends Request {
  userId?: number;
}

export const getPost = [
  param("id", "Post ID is required").isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const postId = +req.params.id;
    const userId = req.userId;

    const user = await getUserById(userId!);
    checkUserIfNotExist(user);

    const post = await getPostWithRelations(+postId); //"8" -> 8

    // const modifiedPost = {
    //   id: post?.id,
    //   title: post?.title,
    //   content: post?.content,
    //   body: post?.body,
    //   image: "/optimize/" + post?.image.split(".")[0] + ".webp",
    //   updatedAt: post?.updatedAt.toLocaleDateString("en-US", {
    //     year: "numeric",
    //     month: "long",
    //     day: "numeric",
    //   }),
    //   fullName:
    //     (post?.author.firstName ?? "") + " " + (post?.author.lastName ?? ""),
    //   category: post?.category.name,
    //   type: post?.type.name,
    //   tags:
    //     post?.tags && post?.tags.length > 0
    //       ? post?.tags.map((i) => i.name)
    //       : null,
    // };

    res.status(200).json({ message: "Post Detail ", post });
  },
];

export const getPostsByPagination = async (
  req: CustomRequest,
  res: Response
) => {
  res.status(200).json({ message: "Post updated successfully." });
};

export const getInfinitePostsByPagination = async (
  req: CustomRequest,
  res: Response
) => {
  res.status(200).json({ message: "Post deleted successfully." });
};
