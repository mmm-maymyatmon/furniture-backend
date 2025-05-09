import e, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { errorCode } from "../../config/errorCode";

interface CustomRequest extends Request {
  userId?: number;
}



export const auth = (req: CustomRequest, res: Response, next: NextFunction) => {
  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    const err: any = new Error("You are not authenticated user.");
    err.status = 401;
    err.code = errorCode.unauthenticated;
    return next(err);
  }

  if (!accessToken) {
    const err: any = new Error("You are not authenticated user.");
    err.status = 401;
    err.code = errorCode.accessTokenExpired;
    return next(err);
  }
  //verify the access token
  let decoded: any;
  try {
    decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as {
      id: number;
    };
    
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      error.message = "Access token is expired.";
      error.status = 401;
      error.code = errorCode.accessTokenExpired;
    } else {
      error.message = "Access token is invalid.";
      error.status = 400;
      error.code = errorCode.attack;
    }
    return next(error);
  }

  req.userId = decoded.id;


  next();
};
