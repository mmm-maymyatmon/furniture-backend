import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface CustomRequest extends Request {
  userId?: number;
}



export const auth = (req: CustomRequest, res: Response, next: NextFunction) => {
  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    const err: any = new Error("You are not authenticated user.");
    err.status = 401;
    err.code = "Error_Unauthenticated";
    return next(err);
  }

  if (!accessToken) {
    const err: any = new Error("You are not authenticated user.");
    err.status = 401;
    err.code = "Error_AccessTokenExpired";
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
      error.message = "Access token has expired.";
      error.status = 401;
      error.code = "Error_AccessTokenExpired";
    } else {
      error.message = "Access token is invalid.";
      error.status = 401;
      error.code = "Error_Attack";
    }
    return next(error);
  }

  req.userId = decoded.id;


  next();
};
