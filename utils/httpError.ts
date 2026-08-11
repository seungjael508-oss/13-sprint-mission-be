import { Prisma } from '@prisma/client';

/** 응답 상태 코드를 함께 실어 던지는 에러. app.ts의 전역 에러 핸들러가 statusCode를 읽는다. */
export class HttpError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

/** catch로 잡힌 값은 unknown이므로 메시지를 안전하게 꺼낸다. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

export function getErrorStatusCode(error: unknown, fallback: number): number {
  return error instanceof HttpError ? error.statusCode : fallback;
}

/** P2025 = Prisma가 수정/삭제 대상 레코드를 찾지 못했을 때의 코드 */
export function isRecordNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}
