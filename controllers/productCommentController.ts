import prisma from '../lib/prisma.js';
import { getAuthenticatedUserId } from '../utils/auth.js';
import { HttpError, getErrorMessage, isRecordNotFoundError } from '../utils/httpError.js';
import { serializeProductCommentResponse } from '../utils/productResponses.js';
import { isRequestBody } from '../utils/requestValidation.js';
import type {
  ApiRequest,
  ApiResponse,
  CommentListQuery,
  CommentPayload,
  CommentResponse,
  CursorListResponse,
  ProductCommentParams,
  ProductIdParams,
} from '../types/api.js';

type ProductCommentListResult = CursorListResponse<CommentResponse>;

function validateCommentPayload(body: unknown): CommentPayload {
  if (!isRequestBody(body) || typeof body.content !== 'string') {
    throw new HttpError('댓글 내용을 확인해 주세요.', 400);
  }
  return { content: body.content };
}

export async function createProductComment(
  req: ApiRequest<CommentResponse, ProductIdParams>,
  res: ApiResponse<CommentResponse>,
) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const productId = Number(req.params.productId);
    const { content } = validateCommentPayload(req.body);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });

    const comment = await prisma.productComment.create({
      data: { content, productId, userId },
      include: { user: { select: { id: true, nickname: true } } },
    });
    res.status(201).json(serializeProductCommentResponse(comment));
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
}

export async function getProductComments(
  req: ApiRequest<ProductCommentListResult, ProductIdParams, CommentListQuery>,
  res: ApiResponse<ProductCommentListResult>,
) {
  try {
    const productId = Number(req.params.productId);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const cursor: { cursor?: { id: number }; skip?: number } = req.query.cursor
      ? { cursor: { id: Number(req.query.cursor) }, skip: 1 }
      : {};

    const comments = await prisma.productComment.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, nickname: true } },
      },
      ...cursor,
    });

    const hasNext = comments.length > limit;
    if (hasNext) comments.pop();

    const nextCursor = hasNext ? comments[comments.length - 1].id : null;
    res.json({ list: comments.map(serializeProductCommentResponse), nextCursor });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
}

export async function updateProductComment(
  req: ApiRequest<CommentResponse, ProductCommentParams>,
  res: ApiResponse<CommentResponse>,
) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const { content } = validateCommentPayload(req.body);
    const comment = await prisma.productComment.findUnique({
      where: { id: Number(req.params.commentId) },
      select: { productId: true, userId: true },
    });

    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.productId !== Number(req.params.productId)) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.userId !== userId) return res.status(403).json({ message: '권한이 없습니다.' });

    const updated = await prisma.productComment.update({
      where: { id: Number(req.params.commentId) },
      data: { content },
      include: { user: { select: { id: true, nickname: true } } },
    });
    res.json(serializeProductCommentResponse(updated));
  } catch (error) {
    if (isRecordNotFoundError(error)) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    res.status(400).json({ message: getErrorMessage(error) });
  }
}

export async function deleteProductComment(
  req: ApiRequest<void, ProductCommentParams>,
  res: ApiResponse<void>,
) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const comment = await prisma.productComment.findUnique({
      where: { id: Number(req.params.commentId) },
      select: { productId: true, userId: true },
    });

    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.productId !== Number(req.params.productId)) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.userId !== userId) return res.status(403).json({ message: '권한이 없습니다.' });

    await prisma.productComment.delete({
      where: { id: Number(req.params.commentId) },
    });
    res.status(204).send();
  } catch (error) {
    if (isRecordNotFoundError(error)) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    res.status(500).json({ message: getErrorMessage(error) });
  }
}
