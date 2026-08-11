import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import prisma from '../lib/prisma.js';
import type { ApiRequest, ApiResponse, AuthSuccessResponse, UserResponse } from '../types/api.js';
import { getJwtSecret } from '../utils/auth.js';
import { getErrorMessage } from '../utils/httpError.js';
import { isRequestBody } from '../utils/requestValidation.js';

function createAccessToken(userId: number): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '1d' });
}

function serializeUser(user: User): UserResponse {
  return { id: user.id, email: user.email, nickname: user.nickname };
}

export async function signUp(req: ApiRequest<AuthSuccessResponse>, res: ApiResponse<AuthSuccessResponse>) {
  try {
    if (!isRequestBody(req.body)) {
      return res.status(400).json({ message: '필수 항목을 입력해 주세요.' });
    }
    const { email, nickname, password, passwordConfirmation } = req.body;
    if (
      typeof email !== 'string' ||
      typeof nickname !== 'string' ||
      typeof password !== 'string' ||
      !email ||
      !nickname ||
      !password
    ) {
      return res.status(400).json({ message: '필수 항목을 입력해 주세요.' });
    }
    if (typeof passwordConfirmation !== 'string') {
      return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });
    }
    if (password !== passwordConfirmation) return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, nickname, password: hashedPassword },
    });

    res.status(201).json({ accessToken: createAccessToken(user.id), user: serializeUser(user) });
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
}

export async function signIn(req: ApiRequest<AuthSuccessResponse>, res: ApiResponse<AuthSuccessResponse>) {
  try {
    if (!isRequestBody(req.body)) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해 주세요.' });
    }
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해 주세요.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    res.json({ accessToken: createAccessToken(user.id), user: serializeUser(user) });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
}
