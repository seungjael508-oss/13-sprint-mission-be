import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { getAuthenticatedUserId, setOptionalAuthenticatedUser } from '../utils/auth.js';
import { HttpError, getErrorMessage, getErrorStatusCode, isRecordNotFoundError } from '../utils/httpError.js';
import { serializeArticleResponse } from '../utils/articleResponses.js';
import { isRequestBody } from '../utils/requestValidation.js';
import type {
  ApiRequest,
  ApiResponse,
  ArticleCreatePayload,
  ArticleIdParams,
  ArticleListItemResponse,
  ArticleListQuery,
  ArticleResponse,
  ArticleUpdatePayload,
  IdParams,
  NoParams,
  OffsetListResponse,
} from '../types/api.js';

const writerInclude = { user: { select: { id: true, nickname: true } } } as const;
type ArticleListResult = OffsetListResponse<ArticleListItemResponse>;

function validateArticleCreatePayload(body: unknown): ArticleCreatePayload {
  if (!isRequestBody(body) || typeof body.title !== 'string' || typeof body.content !== 'string') {
    throw new HttpError('게시글 제목과 내용을 확인해 주세요.', 400);
  }
  if (body.image !== undefined && body.image !== null && typeof body.image !== 'string') {
    throw new HttpError('게시글 이미지 경로를 확인해 주세요.', 400);
  }
  return { title: body.title, content: body.content, image: body.image ?? null };
}

function validateArticleUpdatePayload(body: unknown): ArticleUpdatePayload {
  if (!isRequestBody(body)) throw new HttpError('요청 본문을 확인해 주세요.', 400);
  const data: ArticleUpdatePayload = {};
  if (body.title !== undefined) {
    if (typeof body.title !== 'string') throw new HttpError('게시글 제목을 확인해 주세요.', 400);
    data.title = body.title;
  }
  if (body.content !== undefined) {
    if (typeof body.content !== 'string') throw new HttpError('게시글 내용을 확인해 주세요.', 400);
    data.content = body.content;
  }
  if (body.image !== undefined) {
    if (body.image !== null && typeof body.image !== 'string') {
      throw new HttpError('게시글 이미지 경로를 확인해 주세요.', 400);
    }
    data.image = body.image;
  }
  return data;
}

export async function getArticles(
  req: ApiRequest<ArticleListResult, NoParams, ArticleListQuery>,
  res: ApiResponse<ArticleListResult>,
) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit || req.query.pageSize) || 10, 1), 50);
    const offset = (page - 1) * limit;
    const keyword = String(req.query.keyword || '').trim();
    const orderBy: Prisma.ArticleOrderByWithRelationInput =
      req.query.orderBy === 'like' ? { likeCount: 'desc' } : { createdAt: 'desc' };
    if (keyword.length > 50) return res.status(400).json({ message: '검색어는 50자 이내로 입력해 주세요.' });

    const where: Prisma.ArticleWhereInput = keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { content: { contains: keyword, mode: 'insensitive' } },
          ],
        }
      : {};

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          image: true,
          likeCount: true,
          createdAt: true,
          updatedAt: true,
          user: writerInclude.user,
        },
      }),
      prisma.article.count({ where }),
    ]);

    res.json({ list: articles.map(serializeArticleResponse), totalCount: total, offset, limit });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
}

export async function createArticle(req: ApiRequest<ArticleResponse>, res: ApiResponse<ArticleResponse>) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const data = validateArticleCreatePayload(req.body);
    const article = await prisma.article.create({
      data: {
        ...data,
        userId,
      },
      include: writerInclude,
    });
    res.status(201).json(serializeArticleResponse(article));
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
}

export async function getArticle(
  req: ApiRequest<ArticleResponse, IdParams>,
  res: ApiResponse<ArticleResponse>,
) {
  try {
    setOptionalAuthenticatedUser(req);
    // 비로그인(-1)은 어떤 실제 userId와도 매칭되지 않는 좋아요 조회 sentinel
    const userId = req.user?.id ?? -1;
    const article = await prisma.article.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true,
        title: true,
        content: true,
        image: true,
        likeCount: true,
        createdAt: true,
        updatedAt: true,
        user: writerInclude.user,
        likes: { where: { userId }, select: { id: true } },
      },
    });
    if (!article) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });

    const { likes, ...articleWithoutLikes } = article;
    res.json(serializeArticleResponse({ ...articleWithoutLikes, isLiked: likes.length > 0 }));
  } catch {
    res.status(400).json({ message: '잘못된 게시글 id입니다.' });
  }
}

export async function updateArticle(
  req: ApiRequest<ArticleResponse, IdParams>,
  res: ApiResponse<ArticleResponse>,
) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const current = await prisma.article.findUnique({
      where: { id: Number(req.params.id) },
      select: { userId: true },
    });
    if (!current) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (current.userId !== userId) return res.status(403).json({ message: '권한이 없습니다.' });

    const data: Prisma.ArticleUpdateInput = validateArticleUpdatePayload(req.body);

    const article = await prisma.article.update({
      where: { id: Number(req.params.id) },
      data,
      include: writerInclude,
    });
    res.json(serializeArticleResponse(article));
  } catch (error) {
    if (isRecordNotFoundError(error)) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    res.status(400).json({ message: getErrorMessage(error) });
  }
}

export async function deleteArticle(req: ApiRequest<void, IdParams>, res: ApiResponse<void>) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const current = await prisma.article.findUnique({
      where: { id: Number(req.params.id) },
      select: { userId: true },
    });
    if (!current) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (current.userId !== userId) return res.status(403).json({ message: '권한이 없습니다.' });

    await prisma.article.delete({
      where: { id: Number(req.params.id) },
    });
    res.status(204).send();
  } catch (error) {
    if (isRecordNotFoundError(error)) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    res.status(500).json({ message: getErrorMessage(error) });
  }
}

export async function likeArticle(
  req: ApiRequest<ArticleResponse, ArticleIdParams>,
  res: ApiResponse<ArticleResponse>,
) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const articleId = Number(req.params.articleId);
    const article = await prisma.$transaction(async (tx) => {
      const exists = await tx.article.findUnique({ where: { id: articleId }, select: { id: true } });
      if (!exists) throw new HttpError('게시글을 찾을 수 없습니다.', 404);

      const like = await tx.articleLike.findUnique({
        where: { userId_articleId: { userId, articleId } },
      });
      if (like) return tx.article.findUnique({ where: { id: articleId }, include: writerInclude });

      await tx.articleLike.create({ data: { userId, articleId } });
      return tx.article.update({
        where: { id: articleId },
        data: { likeCount: { increment: 1 } },
        include: writerInclude,
      });
    });

    if (!article) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    res.json(serializeArticleResponse({ ...article, isLiked: true }));
  } catch (error) {
    res.status(getErrorStatusCode(error, 400)).json({ message: getErrorMessage(error) });
  }
}

export async function unlikeArticle(
  req: ApiRequest<ArticleResponse, ArticleIdParams>,
  res: ApiResponse<ArticleResponse>,
) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const articleId = Number(req.params.articleId);
    const article = await prisma.$transaction(async (tx) => {
      const like = await tx.articleLike.findUnique({
        where: { userId_articleId: { userId, articleId } },
      });
      if (!like) return tx.article.findUnique({ where: { id: articleId }, include: writerInclude });

      await tx.articleLike.delete({ where: { id: like.id } });
      return tx.article.update({
        where: { id: articleId },
        data: { likeCount: { decrement: 1 } },
        include: writerInclude,
      });
    });

    if (!article) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    res.json(serializeArticleResponse({ ...article, isLiked: false }));
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
}
