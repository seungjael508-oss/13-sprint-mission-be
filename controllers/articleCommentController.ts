import prisma from '../lib/prisma.js';
import { getAuthenticatedUserId } from '../utils/auth.js';
import { HttpError, getErrorMessage, isRecordNotFoundError } from '../utils/httpError.js';
import { serializeArticleCommentResponse } from '../utils/articleResponses.js';
import { isRequestBody } from '../utils/requestValidation.js';
import type {
  ApiRequest,
  ApiResponse,
  ArticleCommentParams,
  ArticleIdParams,
  CommentListQuery,
  CommentPayload,
  CommentResponse,
  CursorListResponse,
} from '../types/api.js';

const writerInclude = { user: { select: { id: true, nickname: true } } } as const;
type ArticleCommentListResult = CursorListResponse<CommentResponse>;

function validateCommentPayload(body: unknown): CommentPayload {
  if (!isRequestBody(body) || typeof body.content !== 'string') {
    throw new HttpError('댓글 내용을 확인해 주세요.', 400);
  }
  return { content: body.content };
}

export async function createArticleComment(
  req: ApiRequest<CommentResponse, ArticleIdParams>,
  res: ApiResponse<CommentResponse>,
) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const articleId = Number(req.params.articleId);
    const { content } = validateCommentPayload(req.body);
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });

    const comment = await prisma.articleComment.create({
      data: { content, articleId, userId },
      include: writerInclude,
    });
    res.status(201).json(serializeArticleCommentResponse(comment));
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
}

export async function getArticleComments(
  req: ApiRequest<ArticleCommentListResult, ArticleIdParams, CommentListQuery>,
  res: ApiResponse<ArticleCommentListResult>,
) {
  try {
    const articleId = Number(req.params.articleId);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const cursor: { cursor?: { id: number }; skip?: number } = req.query.cursor
      ? { cursor: { id: Number(req.query.cursor) }, skip: 1 }
      : {};

    const comments = await prisma.articleComment.findMany({
      where: { articleId },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      select: { id: true, content: true, createdAt: true, user: writerInclude.user },
      ...cursor,
    });

    const hasNext = comments.length > limit;
    if (hasNext) comments.pop();

    res.json({
      list: comments.map(serializeArticleCommentResponse),
      nextCursor: hasNext ? comments[comments.length - 1].id : null,
    });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
}

export async function updateArticleComment(
  req: ApiRequest<CommentResponse, ArticleCommentParams>,
  res: ApiResponse<CommentResponse>,
) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const { content } = validateCommentPayload(req.body);
    const currentComment = await prisma.articleComment.findUnique({
      where: { id: Number(req.params.commentId) },
      select: { articleId: true, userId: true },
    });

    if (!currentComment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (currentComment.articleId !== Number(req.params.articleId)) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (currentComment.userId !== userId) return res.status(403).json({ message: '권한이 없습니다.' });

    const comment = await prisma.articleComment.update({
      where: { id: Number(req.params.commentId) },
      data: { content },
      include: writerInclude,
    });
    res.json(serializeArticleCommentResponse(comment));
  } catch (error) {
    if (isRecordNotFoundError(error)) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    res.status(400).json({ message: getErrorMessage(error) });
  }
}

export async function deleteArticleComment(
  req: ApiRequest<void, ArticleCommentParams>,
  res: ApiResponse<void>,
) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const comment = await prisma.articleComment.findUnique({
      where: { id: Number(req.params.commentId) },
      select: { articleId: true, userId: true },
    });

    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.articleId !== Number(req.params.articleId)) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.userId !== userId) return res.status(403).json({ message: '권한이 없습니다.' });

    await prisma.articleComment.delete({ where: { id: Number(req.params.commentId) } });
    res.status(204).send();
  } catch (error) {
    if (isRecordNotFoundError(error)) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    res.status(500).json({ message: getErrorMessage(error) });
  }
}
