import type { Request, Response } from 'express';

/** 인증 미들웨어가 요청에 채워 넣는 사용자 정보 */
export interface AuthenticatedUser {
  id: number;
}

/**
 * 인증 헬퍼가 받는 최소 요청 타입.
 * Request 제네릭 조합과 관계없이 실제로 사용하는 headers만 요구한다.
 */
export type AuthenticatedRequest = Pick<Request<Record<string, string>, unknown, unknown>, 'headers'> & {
  user?: AuthenticatedUser;
};

/** 모든 에러 응답의 공통 형태 */
export interface ErrorResponse {
  message: string;
}

export type ApiResult<TSuccess> = TSuccess | ErrorResponse;

/** 외부 요청 본문은 컨트롤러에서 검증하기 전까지 항상 unknown이다. */
export type ApiRequest<
  TSuccess,
  TParams = NoParams,
  TQuery = NoQuery,
> = Request<TParams, ApiResult<TSuccess>, unknown, TQuery>;

export type ApiResponse<TSuccess> = Response<ApiResult<TSuccess>>;

/** page/offset 기반 목록 응답 */
export interface OffsetListResponse<TItem> {
  list: TItem[];
  totalCount: number;
  offset: number;
  limit: number;
  hasNext?: boolean;
}

/** 단순 목록 응답 */
export interface ListResponse<TItem> {
  list: TItem[];
  totalCount: number;
}

/** cursor 기반 목록 응답 */
export interface CursorListResponse<TItem> {
  list: TItem[];
  nextCursor: number | null;
}

/** 경로 파라미터가 없는 라우트용 */
export type NoParams = Record<string, string>;
export type NoQuery = Record<string, never>;

/** 경로 파라미터는 항상 문자열로 들어온다 */
export type IdParams = { id: string };
export type ArticleIdParams = { articleId: string };
export type ArticleCommentParams = { articleId: string; commentId: string };
export type ProductIdParams = { productId: string };
export type ProductCommentParams = { productId: string; commentId: string };

/** 컨트롤러가 소비하는 쿼리 키를 라우트별로 고정한다. */
export type ArticleListQuery = {
  page?: string;
  limit?: string;
  pageSize?: string;
  keyword?: string;
  orderBy?: string;
};

export type ProductListQuery = {
  page?: string;
  limit?: string;
  pageSize?: string;
  offset?: string;
  keyword?: string;
  search?: string;
  orderBy?: string;
};

export type CommentListQuery = {
  limit?: string;
  cursor?: string;
};

export interface WriterResponse {
  id: number;
  nickname: string;
}

export interface UserResponse extends WriterResponse {
  email: string;
}

export interface AuthSuccessResponse {
  accessToken: string;
  user: UserResponse;
}

export interface ArticleResponse {
  id: number;
  title: string;
  content: string;
  image: string | null;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  writer: WriterResponse;
  isLiked?: boolean;
}

export type ArticleListItemResponse = ArticleResponse;

export interface CommentResponse {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  articleId?: number;
  productId?: number;
  writer: WriterResponse;
}

export interface ProductListItemResponse {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  likeCount: number;
  createdAt: Date;
}

export interface ProductResponse extends ProductListItemResponse {
  description: string;
  tags: string[];
  updatedAt: Date;
  ownerId?: number;
  isLiked?: boolean;
  comments?: CommentResponse[];
}

export interface UploadedImageResponse {
  imageUrl: string;
}

export interface HealthResponse {
  message: string;
}

/** 검증 뒤 내부에서 사용하는 요청 payload 타입 */
export interface SignUpPayload {
  email: string;
  nickname: string;
  password: string;
  passwordConfirmation: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface ArticleCreatePayload {
  title: string;
  content: string;
  image: string | null;
}

export interface ArticleUpdatePayload {
  title?: string;
  content?: string;
  image?: string | null;
}

export interface CommentPayload {
  content: string;
}

export interface ProductCreatePayload {
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  tags: string[];
}

export interface ProductUpdatePayload {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string | null;
  tags?: string[];
}
