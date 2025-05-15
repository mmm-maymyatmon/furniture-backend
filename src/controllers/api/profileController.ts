import { Request, Response, NextFunction } from "express";
import { body, check, query, validationResult } from "express-validator";
import { errorCode } from "../../../config/errorCode";
import { getUserById, updateUser } from "../../services/authService";
import { checkUserExist, checkUserIfNotExist } from "../../utils/auth";
import { checkUploadFile } from "../../utils/check";
import { unlink } from "node:fs/promises";
import path from "path";

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

  
}