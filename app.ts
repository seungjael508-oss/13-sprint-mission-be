import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import type { NextFunction } from 'express';
import multer from 'multer';
import swaggerUi from 'swagger-ui-express';
import articleRoutes from './routes/articleRoutes.js';
import authRoutes from './routes/authRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import productRoutes from './routes/productRoutes.js';
import swaggerSpecs from './src/config/swagger.js';
import type { ApiRequest, ApiResponse, HealthResponse } from './types/api.js';
import { HttpError, getErrorMessage, isRecordNotFoundError } from './utils/httpError.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.use(
  '/uploads',
  express.static('uploads', {
    setHeaders(response) {
      response.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

app.use('/auth', authRoutes);
app.use('/images', imageRoutes);
app.use(['/products', '/items'], productRoutes);
app.use('/articles', articleRoutes);

app.get('/', (req: ApiRequest<HealthResponse>, res: ApiResponse<HealthResponse>) => {
  res.json({ message: 'Panda Market API is running.' });
});

app.use((req: ApiRequest<never>, res: ApiResponse<never>) => {
  res.status(404).json({ message: '요청한 리소스를 찾을 수 없습니다.' });
});

app.use((err: unknown, req: ApiRequest<never>, res: ApiResponse<never>, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: '업로드 파일을 확인해 주세요.' });
  }

  if (err instanceof Error && err.message.includes('이미지 파일')) {
    return res.status(400).json({ message: err.message });
  }

  if (isRecordNotFoundError(err)) {
    return res.status(404).json({ message: '요청한 리소스를 찾을 수 없습니다.' });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: getErrorMessage(err) });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중이에요!`);
});
