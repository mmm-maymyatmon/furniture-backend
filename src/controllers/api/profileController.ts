import { Request, Response, NextFunction } from "express";
import { body, query, validationResult } from "express-validator";
import { errorCode } from "../../../config/errorCode";
import { getUserById } from "../../services/authService";
import { checkUserExist, checkUserIfNotExist } from "../../utils/auth";
import { checkUploadFile } from "../../utils/check";

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
    res.status(200).json({ message: req.t("changeLan", { lang: lng }) })
  }];

  export const uploadProfile = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const image = req.file;  
    const user = await getUserById(userId!);
    checkUserIfNotExist(user);
    checkUploadFile(image);



    res.status(200).json({
      message: "Profile image uploaded successfully"

    })
  }