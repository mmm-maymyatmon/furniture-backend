import { Request, Response, NextFunction } from "express";
import { getUserById } from "../services/authService";
import { errorCode } from "../../config/errorCode";
import { createError } from "../utils/error";

interface CustomRequest extends Request {
  userId?: number;
  user?: any;
}

//authorize(true, "ADMIN", "AUTHOR" ) //deny - "USER"
//authorize(false, "USER") //allow - "ADMIN", "AUTHOR"

export const authorize = (permission: boolean, ...roles: string[]) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await getUserById(userId!);

    if (!user) {
      return next(
        createError(
          "This account has not registered!.",
          401,
          errorCode.unauthenticated
        )
      );
    }
    const result = roles.includes(user.role);

    if (permission && !result) {
      return next(
        createError("This action is not allowed.", 403, errorCode.unauthorized)
      );
    }
    if (!permission && result) {
      return next(
        createError("This action is not allowed.", 403, errorCode.unauthorized)
      );
    }
    req.user = user;
    next();
  };
};
