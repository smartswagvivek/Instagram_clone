import { cloudinaryDelete, cloudinaryUpload } from '../config/cloudinary.js';

export const uploadMediaFiles = async (files = [], folder = 'posts') =>
  Promise.all(
    files.map(async (file) => {
      const uploaded = await cloudinaryUpload(file, folder);

      return {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        type: file.mimetype?.startsWith('video') ? 'video' : 'image',
      };
    })
  );

export const removeMediaFiles = async (media = []) => {
  await Promise.all(media.map((item) => cloudinaryDelete(item.publicId)));
};
