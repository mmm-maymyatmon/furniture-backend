import { Request, Response, NextFunction } from "express";

export const getAllUsers = async (
  Request: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({
    message: "All users",
  });
};
