import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/', 'video/'];
  const accepted = allowed.some((prefix) => file.mimetype.startsWith(prefix));

  if (!accepted) {
    cb(new Error('Only image and video uploads are supported.'));
    return;
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10,
  },
});
