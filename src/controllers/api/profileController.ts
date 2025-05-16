import { Request, Response, NextFunction } from "express";
import { body, check, query, validationResult } from "express-validator";
import { errorCode } from "../../../config/errorCode";
import { getUserById, updateUser } from "../../services/authService";
import { checkUserExist, checkUserIfNotExist } from "../../utils/auth";
import { checkUploadFile } from "../../utils/check";
import { unlink } from "node:fs/promises";
import path from "path";
import sharp from "sharp";
import ImageQueue from "../../jobs/queues/imageQueue";

interface CustomRequest extends Request {
  userId?: number;
  file?: any;
}

export const changeLanguage = [
  query("lng", "Invalid language code.")
    .trim()
    .notEmpty()
    .matches(/^[a-z]{2}$/)
    .isLength({ min: 2, max: 2 }),
  (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    //If validation error occurs
    if (errors.length > 0) {
      const error = new Error(errors[0].msg) as any;
      error.status = 400;
      error.code = errorCode.invalid;
      return next(error);
    }
    const { lng } = req.query;
    res.cookie("i18next", lng);
    res.status(200).json({ message: req.t("changeLan", { lang: lng }) });
  },
];

export const uploadProfile = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const image = req.file;
  const user = await getUserById(userId!);
  checkUserIfNotExist(user);
  checkUploadFile(image);
  // console.log("Image: ", image);
  const fileName = image.filename;

  if (user?.image) {
    try {
      const filePath = path.join(
        __dirname,
        "../../../uploads/images",
        user!.image!
      );
      await unlink(filePath);
    } catch (error) {
      console.log("Error deleting file: ", error);
    }
  }

  const userData = {
    image: fileName,
  };
  await updateUser(user?.id!, userData);

  res.status(200).json({
    message: "Profile image uploaded successfully",
    image: fileName,
  });
};

export const uploadProfileMultiple = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({
    message: "Multiple Profile images uploaded successfully",
  });
};

export const uploadProfileOptimize = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const image = req.file;
  const user = await getUserById(userId!);
  checkUserIfNotExist(user);
  checkUploadFile(image);

  const splitFileName = req.file.filename.split(".")[0];

  const job = await ImageQueue.add("optimize-image", {
    filePath: req.file.path,
    fileName: `${splitFileName}.webp`,
  });



  // try {
  //   const optimizedImagePath = path.join(
  //     __dirname,
  //     "../../../",
  //     "uploads/images",
  //     fileName
  //   );
  //   await sharp(req.file.buffer)
  //     .resize(200, 200)
  //     .webp({ quality: 50 })
  //     .toFile(optimizedImagePath);
  // } catch (error) {
  //   console.log(error);
  //   res.status(500).json({
  //     message: "Image optimization failed.",
  //   });
  //   return;
  // }

  if (user?.image) {
    try {
      const originalFilePath = path.join(
        __dirname,
        "../../../",
        "uploads/images",
        user!.image!
      );
      const optimizeFilePath = path.join(
        __dirname,
        "../../../",
        "uploads/optimize",
        user!.image!.split(".")[0] + ".webp"
      );
      await unlink(originalFilePath);
      await unlink(optimizeFilePath);
    } catch (error) {
      console.log(error);
    }
  }

  const userData = {
    image: req.file.filename,
  };
  await updateUser(user?.id!, userData);

  res.status(200).json({
    message: "Profile image uploaded and optimized successfully",
    image: splitFileName + ".webp",
    jobId: job.id,
  });
};
