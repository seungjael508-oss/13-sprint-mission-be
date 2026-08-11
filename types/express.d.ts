import 'express';
// multer가 Express.Request에 file/files를 추가하므로, 업로드 컨트롤러가 multer를
// 직접 import 하지 않아도 타입을 볼 수 있도록 여기서 한 번 불러온다.
import 'multer';
import type { AuthenticatedUser } from './api.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
