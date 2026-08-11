import type { ApiRequest, ApiResponse, UploadedImageResponse } from '../types/api.js';
import { storeUploadedImage } from '../utils/imageUploads.js';

export async function uploadImage(
  req: ApiRequest<UploadedImageResponse>,
  res: ApiResponse<UploadedImageResponse>,
) {
  if (!req.file) {
    return res.status(400).json({ message: '이미지 파일을 선택해 주세요.' });
  }

  const filename = await storeUploadedImage(req.file.buffer);
  res.status(201).json({ imageUrl: `/uploads/${filename}` });
}
