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
import { createError } from "../utils/error";
import { create } from "domain";

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
      return next(createError(errors[0].msg, 400, errorCode.invalid));
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
          return next(createError(errorCode.overLimit, 405, "Otp is allowed to request 5 times per day.Please try again tomorrow."));
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
      return next(createError(errors[0].msg, 400, errorCode.invalid));
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
      return next(createError("Token is invalid.", 400, errorCode.invalid));
    }

    //OTP is expired
    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 2;

    if (isExpired) {
      return next(createError("OTP is expired.", 403, errorCode.otpExpired));
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

      return next(createError("OTP is incorrect.", 401, errorCode.invalid));
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
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { phone, password, token } = req.body;
    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    // OTP error count is over limit
    if (otpRow?.errorCount === 5) {
      return next(createError("This request may be an attack.", 400, errorCode.attack));
    }

    // Token is wrong
    if (otpRow?.verifiedToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);
      return next(createError("Token is invalid.", 400, errorCode.invalid));
    }

    //Request is expired
    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 10;
    if (isExpired) {
      return next(createError("Your request is expired. Please try again.", 403, errorCode.invalid));
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
        expiresIn: 60 * 15, // 15 minutes
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
      return next(createError(errors[0].msg, 400, errorCode.invalid));
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

      return next(createError( req.t("wrong Password") , 401, errorCode.invalid));
    }

    //Authorization token
    const accessTokenPayload = { id: user!.id };
    const refreshTokenPayload = { id: user!.id, phone: user!.phone };
    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 60 * 10, // 10 minutes
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
    return next(createError("You are not authenticated user.", 401, errorCode.unauthenticated));
  }

  let decoded: { id: number; phone: string };
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
      id: number;
      phone: string;
    };
  } catch (err) {
    return next(createError("You are not authenticated user.", 401, errorCode.unauthenticated));
  }

  if (isNaN(decoded.id)) {

    return next(createError("You are not authenticated user.", 401, errorCode.unauthenticated));
  }

  const user = await getUserById(decoded.id);
  checkUserIfNotExist(user);

  if (user!.phone !== decoded.phone) {
    return next(createError("You are not authenticated user.", 401, errorCode.unauthenticated));
  }

  const userData = {
    randToken: generateToken(),
  };

  await updateUser(user!.id, userData);

  res
    .clearCookie("accessToken", {
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

export const forgetPassword = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches(/^[0-9]+$/)
    .isLength({ min: 5, max: 12 }),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    //If validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    let phone = req.body.phone;
    if (phone.slice(0, 2) == "09") {
      phone = phone.substring(2, phone.length);
    }

    const user = await getUserByPhone(phone);
    checkUserIfNotExist(user);

    const otp = process.env.NODE_ENV === "production" ? generateOTP() : 123456;
    const salt = await bcrypt.genSalt(10);
    const hashOtp = await bcrypt.hash(otp.toString(), salt);
    const token = generateToken();

    const otpRow = await getOtpByPhone(phone);

    let result;
    //Never request OTP before

    const lastOtpRequest = new Date(otpRow!.updatedAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    const isSameDate = lastOtpRequest === today;
    checkOtpErrorIfSameDate(isSameDate, otpRow!.errorCount);
    if (!isSameDate) {
      const OtpData = {
        otp: hashOtp,
        rememberToken: token,
        count: 1,
        errorCount: 0,
      };
      result = await updateOtp(otpRow!.id, OtpData);
    } else {
      //If Otp is in the same date
      if (otpRow!.count === 5) {
        return next(createError("Otp is allowed to request 5 times per day.Please try again tomorrow.", 405, errorCode.overLimit));
      } else {
        //If Otp is in the same date but not over limit
        const OtpData = {
          otp: hashOtp,
          rememberToken: token,
          count: {
            increment: 1,
          },
        };
        result = await updateOtp(otpRow!.id, OtpData);
      }
    }

    res.status(200).json({
      message: `We are sending OTP to 09${result.phone} for password reset.`,
      phone: result.phone,
      token: result.rememberToken,
    });
  },
];

export const verifyOtpForChangePassword = [
  body("phone")
    .trim()
    .notEmpty()
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
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { phone, otp, token } = req.body;
    const user = await getUserByPhone(phone);
    checkUserIfNotExist(user);

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
      return next(createError("Token is invalid.", 400, errorCode.invalid));
    }

    //OTP is expired
    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 2;

    if (isExpired) {
      return next(createError("OTP is expired.", 403, errorCode.otpExpired));
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

export const resetPassword = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Token must not be empty")
    .escape(),
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches(/^[0-9]+$/)
    .isLength({ min: 5, max: 12 }),
  body("password", "Password must be 8 characters")
    .trim()
    .notEmpty()
    .matches(/^[0-9]+$/)
    .isLength({ min: 8, max: 8 }),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { phone, password, token } = req.body;
    const user = await getUserByPhone(phone);
    checkUserIfNotExist(user);

    const otpRow = await getOtpByPhone(phone);

    // OTP error count is over limit
    if (otpRow?.errorCount === 5) {

      return next(createError("This request may be an attack. If not, try again tomorrow.", 400, errorCode.attack));
    }

    if (otpRow?.verifiedToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);
      return next(createError("Token is invalid.", 400, errorCode.invalid));
    }

    //request is expired
    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 5;
    if (isExpired) {
      return next(createError("Your request is expired. Please try again.", 403, errorCode.invalid));
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    //jwt token
    const accessPayload = { id: user!.id };
    const refreshPayload = { id: user!.id, phone: user!.phone };

    const accessToken = jwt.sign(
      accessPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 60 * 15, // 10 minutes
      }
    );

    const refreshToken = jwt.sign(
      refreshPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d", // 30 days
      }
    );

    const userUpdateData = {
      password: hashPassword,
      randToken: refreshToken,
    };
    await updateUser(user!.id, userUpdateData);

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 60 * 15 * 1000, // 15 minutes
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .status(200)
      .json({
        message: "Successfully reset your password.",
        userId: user!.id,
      });
  },
];
