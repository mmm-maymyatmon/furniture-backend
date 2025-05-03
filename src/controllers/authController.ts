import { body, check, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { getUserByPhone } from "../services/authServices";
import { checkUserExist } from "../utils/auth";


export const register = [
  body("phone")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .matches(/^[0-9]+$/).withMessage("Phone number must contain only digits")
    .isLength({ min: 7, max: 12 }).withMessage("Phone number must be 7 to 12 digits long"),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error = new Error(errors[0].msg) as any;
      error.status = 400;
      error.code = "Error_Invalid";
      return next(error);
    }
    let phone = req.body.phone;
    if(phone.slice(0, 2) == "09") {
      phone = phone.substring(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    checkUserExist(user);

    res.status(200).json({ message: phone });
  },
];


export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({ message: "Login" });
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({ message: "Verify OTP" });
};

export const confirmPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({ message: "Confirm Password" });
};
