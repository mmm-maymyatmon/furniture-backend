import { Request, Response, NextFunction } from "express";

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

  next();
};
