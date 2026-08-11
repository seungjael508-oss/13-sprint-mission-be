import type { NextFunction } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/imageController.js';
import type { ApiRequest, ApiResponse } from '../types/api.js';
import { getAuthenticatedUserId } from '../utils/auth.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 5 * 1024 * 1024 },
});

function requireAuth(req: ApiRequest<never>, res: ApiResponse<never>, next: NextFunction) {
  if (!getAuthenticatedUserId(req, res)) return;
  next();
}

router.post('/upload', requireAuth, upload.single('image'), uploadImage);

export default router;
