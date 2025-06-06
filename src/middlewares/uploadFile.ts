import { Request, Response, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";

const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // cb(null, 'uploads/images')
    const type = file.mimetype.split("/")[0];
    if (type === "image") {
      cb(null, "uploads/images");
    } else if (type === "video") {
      cb(null, "uploads/videos");
    } else if (type === "audio") {
      cb(null, "uploads/audios");
    } else {
      cb(new Error("Invalid file type"), "uploads/others");
    }
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)+ "." + ext;
    cb(null, uniqueSuffix);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" 
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: fileStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, //Testing 5MB
});

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 }, //Maximum file size 10MB, so image optimizing is needed
})

export default upload;
