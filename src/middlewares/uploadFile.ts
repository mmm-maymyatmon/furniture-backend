import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';

const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // cb(null, 'uploads/images')
    const type = file.mimetype.split('/')[0];
    if (type === 'image') {
      cb(null, 'uploads/images');
    } else if (type === 'video') {
      cb(null, 'uploads/videos');
    }
    else if (type === 'audio') {
      cb(null, 'uploads/audios');
    } else {
      cb(new Error('Invalid file type'), 'uploads/others');
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
});


const upload = multer({ storage: fileStorage })

export default upload