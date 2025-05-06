import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";

import {
  getUserByPhone,
  createOtp,
  getOtpByPhone,
  updateOtp,
} from "../services/authService";
import {
  checkOtpErrorIfSameDate,
  checkOtpRow,
  checkUserExist,
  
} from "../utils/auth";
import { generateOTP, generateToken } from "../utils/generate";
import moment from "moment";

export const register = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9]+$/)
    .withMessage("Phone number must contain only digits")
    .isLength({ min: 7, max: 12 })
    .withMessage("Phone number must be 7 to 12 digits long"),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    //If validation error occurs
    if (errors.length > 0) {
      const error = new Error(errors[0].msg) as any;
      error.status = 400;
      error.code = "Error_Invalid";
      return next(error);
    }
    let phone = req.body.phone;
    if (phone.slice(0, 2) == "09") {
      phone = phone.substring(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otp = 123456;
    // const otp = generateOTP();//for production use
    const salt = await bcrypt.genSalt(10);
    const hashOtp = await bcrypt.hash(otp.toString(), salt);
    const token = generateToken();

    const otpRow = await getOtpByPhone(phone);

    let result;
    //Never request OTP before
    if (!otpRow) {
      const otpData = {
        phone,
        otp: hashOtp,
        rememberToken: token,
        count: 1,
      };
      result = await createOtp(otpData);
    } else {
      const lastOtpRequest = new Date(otpRow.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lastOtpRequest === today;
      checkOtpErrorIfSameDate(isSameDate, otpRow.errorCount);

      if (!isSameDate) {
        const OtpData = {
          otp: hashOtp,
          rememberToken: token,
          count: 1,
          errorCount: 0,
        };
        result = await updateOtp(otpRow.id, OtpData);
      } else {
        //If Otp is in the same date
        if (otpRow.count === 5) {
          const error: any = new Error(
            "Otp is allowed to request 5 times per day.Please try again tomorrow."
          );
          error.status = 405;
          error.code = "Error_OverLimit";
          return next(error);
        } else {
          //If Otp is in the same date but not over limit
          const OtpData = {
            otp: hashOtp,
            rememberToken: token,
            count: {
              increment: 1,
            },
          };
          result = await updateOtp(otpRow.id, OtpData);
        }
      }
    }

    res.status(200).json({
      message: `We are sending OTP to 09${result.phone}`,
      phone: result.phone,
      token: result.rememberToken,
    });
  },
];

export const verifyOtp = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9]+$/)
    .withMessage("Phone number must contain only digits")
    .isLength({ min: 7, max: 12 })
    .withMessage("Phone number must be 7 to 12 digits long"),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits")
    .escape(),

  body("token")
    .trim()
    .notEmpty()
    .withMessage("Token is required")
    .escape(),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length > 0) {
      const error: any = new Error(errors[0].msg);
      error.status = 400;
      error.code = "Error_Invalid";
      return next(error);
    }

    const { phone, otp, token } = req.body;
    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    const lastOtpVerify = new Date(otpRow!.updatedAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    const isSameDate = lastOtpVerify === today;
    //If Otp verify is the same date and over limit
    checkOtpErrorIfSameDate(isSameDate, otpRow!.errorCount);

    //Token is wrong
    if (otpRow?.rememberToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);

      const error: any = new Error("Token is invalid.");
      error.status = 400;
      error.code = "Error_InvalidToken";
      return next(error);
    }

    //OTP is expired
    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 2;

    if (isExpired) {
      const error: any = new Error("OTP is expired.");
      error.status = 403;
      error.code = "Error_Expired";
      return next(error);
    }

    const isMatchOtp = await bcrypt.compare(otp, otpRow!.otp);
    if (!isMatchOtp) {
      if (!isSameDate) {
        const otpData = {
          errorCount: 1,
        };
        await updateOtp(otpRow!.id, otpData);
      } else {
        //If OTP error is not first time today
        const otpData = {
          errorCount: { increment: 1 },
        };
        await updateOtp(otpRow!.id, otpData);
      }

      const error: any = new Error("OTP is incorrect.");
      error.status = 401;
      error.code = "Error_Incorrect";
      return next(error);
    }

    //All are Ok
    const verifiedToken = generateToken();
    const otpData = {
      verifiedToken,
      errorCount: 0,
      count: 1,
    };

    const result = await updateOtp(otpRow!.id, otpData);

    res
      .status(200)
      .json({
        message: "OTP is successfully verified.",
        phone: result.phone,
        token: result.verifiedToken,
      });
  },
];

//Sending OTP ---> Verify OTP ---> Register ---> Login

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({ message: "Login" });
};

export const confirmPassword = [body("phone", "Invalid phone number")
  .trim()
  .notEmpty()
  .matches(/^[0-9]+$/)
  .isLength({ min: 7, max: 12 })
  .withMessage("Phone number must be 7 to 12 digits long"),

body("password", "Password must be 8 characters")
  .trim()
  .notEmpty()
  .matches(/^[0-9]+$/)
  .isLength({ min: 8, max: 8 }),

  body("token", "Invalid token")
  .trim()
  .notEmpty()
  .escape(),
  
  , async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req).array({ onlyFirstError: true });

  if (errors.length > 0) {
    const error: any = new Error(errors[0].msg);
    error.status = 400;
    error.code = "Error_Invalid";
    return next(error);
  }

  const { phone, password, token } = req.body;
  const user = await getUserByPhone(phone);
  checkUserExist(user);

  res.status(200).json({ message: "Confirm Password" });
}];
