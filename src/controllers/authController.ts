import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";

import {
  getUserByPhone,
  createOtp,
  getOtpByPhone,
  updateOtp,
  createUser,
  updateUser,
  getUserById,
} from "../services/authService";
import {
  checkOtpErrorIfSameDate,
  checkOtpRow,
  checkUserExist,
  checkUserIfNotExist,
} from "../utils/auth";
import { generateOTP, generateToken } from "../utils/generate";
import moment from "moment";
import jwt from "jsonwebtoken";
import { errorCode } from "../../config/errorCode";

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
      error.code = errorCode.invalid;
      return next(error);
    }
    let phone = req.body.phone;
    if (phone.slice(0, 2) == "09") {
      phone = phone.substring(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otp = process.env.NODE_ENV === "production" ? generateOTP() : 123456;
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
          error.code = errorCode.overLimit;
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

  body("token").trim().notEmpty().withMessage("Token is required").escape(),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length > 0) {
      const error: any = new Error(errors[0].msg);
      error.status = 400;
      error.code = errorCode.invalid;
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
      error.code = errorCode.invalid;
      return next(error);
    }

    //OTP is expired
    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 2;

    if (isExpired) {
      const error: any = new Error("OTP is expired.");
      error.status = 403;
      error.code = errorCode.otpExpired;
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
      error.code = errorCode.invalid;
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

    res.status(200).json({
      message: "OTP is successfully verified.",
      phone: result.phone,
      token: result.verifiedToken,
    });
  },
];

//Sending OTP ---> Verify OTP ---> Register ---> Login

export const confirmPassword = [
  body("phone", "Invalid phone number")
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

  body("token", "Invalid token").trim().notEmpty().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length > 0) {
      const error: any = new Error(errors[0].msg);
      error.status = 400;
      error.code = errorCode.invalid;
      return next(error);
    }

    const { phone, password, token } = req.body;
    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    // OTP error count is over limit
    if (otpRow?.errorCount === 5) {
      const error: any = new Error("This request may be an attack.");
      error.status = 400;
      error.code = errorCode.attack;
      return next(error);
    }

    // Token is wrong
    if (otpRow?.verifiedToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);
      const error: any = new Error("Token is invalid.");
      error.status = 400;
      error.code = errorCode.invalid;
      return next(error);
    }

    //Request is expired
    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 10;
    if (isExpired) {
      const error: any = new Error(
        "Your request is expired. Please try again."
      );
      error.status = 403;
      error.code = errorCode.invalid;
      return next(error);
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const randToken = "I will replace Refresh Token soon.";

    const userData = {
      phone,
      password: hashPassword,
      randToken,
    };

    const newUser = await createUser(userData);

    const accessTokenPayload = { id: newUser.id };
    const refreshTokenPayload = { id: newUser.id, phone: newUser.phone };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 60 * 2, // 2 minutes
      }
    );

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d", // 30 days
      }
    );

    // Updating randToken with refreshToken

    const userUpdateData = {
      randToken: refreshToken,
    };
    await updateUser(newUser.id, userUpdateData);

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        secure: false, // only true in production
        sameSite: "strict",
        maxAge: 60 * 15 * 1000, // 15 minutes
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        secure: false,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .status(201)
      .json({
        message: "Successfully created an account.",
        userId: newUser.id,
      });
  },
];

export const login = [
  body("phone", "Invalid phone number")
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
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length > 0) {
      const error: any = new Error(errors[0].msg);
      error.status = 400;
      error.code = errorCode.invalid;
      return next(error);
    }

    const password = req.body.password;
    let phone = req.body.phone;
    if (phone.slice(0, 2) == "09") {
      phone = phone.substring(2, phone.length);
    }

    const user = await getUserByPhone(phone);
    checkUserIfNotExist(user);

    //If wrong password was over limit
    if (user?.status === "FREEZE") {
      const error: any = new Error(
        "Your account is freeze. Please contact support team."
      );
      error.status = 403;
      error.code = errorCode.accountFreeze;
      return next(error);
    }

    const isMatchPassword = await bcrypt.compare(password, user!.password);
    if (!isMatchPassword) {
      //-------Starting to record wrong times
      const lastRequest = new Date(user!.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lastRequest === today;

      //Today password is wrong first time
      if (!isSameDate) {
        const userData = {
          errorLoginCount: 1,
        };
        await updateUser(user!.id, userData);
      } else {
        //Today password was wrong
        if (user!.errorLoginCount >= 2) {
          const userData = {
            status: "FREEZE",
          };
          await updateUser(user!.id, userData);
        } else {
          //Today password was wrong one time
          const userData = {
            errorLoginCount: { increment: 1 },
          };
          await updateUser(user!.id, userData);
        }
      }
      //-------Ending ---------------------

      const error: any = new Error(req.t("wrongPassword"));
      error.status = 401;
      error.code = errorCode.invalid;
      return next(error);
    }

    //Authorization token
    const accessTokenPayload = { id: user!.id };
    const refreshTokenPayload = { id: user!.id, phone: user!.phone };
    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 60 * 2, // 2 minutes
      }
    );
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d", // 30 days
      }
    );
    //Updating randToken with refreshToken

    const userData = {
      errorLoginCount: 0, //reset error count
      randToken: refreshToken,
    };

    await updateUser(user!.id, userData);

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        secure: false, // only true in production
        sameSite: "strict",
        maxAge: 60 * 2 * 1000, // 2 minutes
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        secure: false,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .status(200)
      .json({
        message: "Successfully logged in.",
        userId: user!.id,
      });
  },
];

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    const error: any = new Error("You are not authenticated user.");
    error.status = 401;
    error.code = errorCode.unauthenticated;
    return next(error);
  }

  let decoded: { id: number; phone: string };
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
      id: number;
      phone: string;
    };
  } catch (err) {
    const error: any = new Error("You are not authenticated user.");
    error.status = 401;
    error.code = errorCode.unauthenticated;
    return next(error);
  }

  if(isNaN(decoded.id)) {
    const err: any = new Error("You are not an authenticated user.");
    err.status = 401;
    err.code = errorCode.unauthenticated;
    return next(err);
  }

  const user = await getUserById(decoded.id);
  checkUserIfNotExist(user);

  if (user!.phone !== decoded.phone) {
    const error: any = new Error("You are not authenticated user.");
    error.status = 401;
    error.code = errorCode.unauthenticated;
    return next(error);
  }

  const userData = {
    randToken: generateToken(),
  };

  await updateUser(user!.id, userData);

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  })
  .clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  })
  .status(200)
  .json({
    message: "Successfully logged out. See you soon.",
  });
};
