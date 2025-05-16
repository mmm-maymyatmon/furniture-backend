import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { errorCode } from "../../../config/errorCode";

interface CustomRequest extends Request {
  user?: any;
}

export const getPost = async (req: CustomRequest, res: Response) => {
    
  res.status(200).json({message: "Post created successfully."});
};

export const getPostsByPagination = async (req: CustomRequest, res: Response) => {

  res.status(200).json({message: "Post updated successfully."});
};

