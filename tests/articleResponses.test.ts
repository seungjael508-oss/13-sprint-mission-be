import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import test from 'node:test';
import {
  createArticleComment,
  getArticleComments,
  updateArticleComment,
} from '../controllers/articleCommentController.js';
import {
  createArticle,
  getArticle,
  getArticles,
  updateArticle,
} from '../controllers/articleController.js';
import prisma from '../lib/prisma.js';
import swaggerSpecs from '../src/config/swagger.js';

const jwtSecret = 'article-response-test-secret';
const token = jwt.sign({ userId: 7 }, jwtSecret);
process.env.JWT_SECRET = jwtSecret;

type AsyncMethod = (args: unknown) => Promise<unknown>;

function replaceMethod(target: object, name: string, implementation: AsyncMethod): () => void {
  const methods = target as Record<string, unknown>;
  const original = methods[name];
  methods[name] = implementation;
  return () => {
    methods[name] = original;
  };
}

function hasSelectedUser(args: unknown): boolean {
  if (!args || typeof args !== 'object') return false;
  const options = args as Record<string, unknown>;
  const relation = options.select ?? options.include;
  return Boolean(relation && typeof relation === 'object' && 'user' in relation);
}

function createResponse() {
  let statusCode = 200;
  let body: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
    send(value?: unknown) {
      body = value;
      return response;
    },
  } as unknown as Response;

  return {
    response,
    result: () => ({ statusCode, body }),
  };
}

function request(value: object): Request {
  return value as unknown as Request;
}

function getRequiredSchemaFields(schemaName: string): string[] {
  const document = swaggerSpecs as unknown;
  if (!document || typeof document !== 'object' || !('components' in document)) return [];
  const components = document.components;
  if (!components || typeof components !== 'object' || !('schemas' in components)) return [];
  const schemas = components.schemas;
  if (!schemas || typeof schemas !== 'object' || !(schemaName in schemas)) return [];
  const schema = schemas[schemaName];
  if (!schema || typeof schema !== 'object' || !('required' in schema)) return [];
  const required: unknown = schema.required;
  return Array.isArray(required)
    ? required.filter((field: unknown): field is string => typeof field === 'string')
    : [];
}

const writer = { id: 7, nickname: '판다' };
const createdAt = new Date('2026-08-11T00:00:00.000Z');
const updatedAt = new Date('2026-08-11T01:00:00.000Z');
const articleSource = {
  id: 11,
  title: '게시글',
  content: '내용',
  image: null,
  likeCount: 2,
  userId: writer.id,
  createdAt,
  updatedAt,
};

test('OpenAPI requires writer identity on article and comment responses', () => {
  assert.ok(getRequiredSchemaFields('Article').includes('writer'));
  assert.ok(getRequiredSchemaFields('Comment').includes('writer'));
});

function selectedArticle(args: unknown) {
  const { userId: _userId, ...article } = articleSource;
  return hasSelectedUser(args) ? { ...article, user: writer } : article;
}

function mutatedArticle(args: unknown) {
  return hasSelectedUser(args) ? { ...articleSource, user: writer } : articleSource;
}

test('article list and detail responses expose the real writer identity', async () => {
  const restore = [
    replaceMethod(prisma.article, 'findMany', async (args) => [selectedArticle(args)]),
    replaceMethod(prisma.article, 'count', async () => 1),
    replaceMethod(prisma.article, 'findUnique', async (args) => ({ ...selectedArticle(args), likes: [] })),
  ];

  try {
    const listResponse = createResponse();
    await getArticles(
      request({ query: { page: '1', limit: '10' }, headers: {} }),
      listResponse.response,
    );
    assert.deepEqual(listResponse.result().body, {
      list: [
        {
          id: 11,
          title: '게시글',
          content: '내용',
          image: null,
          likeCount: 2,
          createdAt,
          updatedAt,
          writer,
        },
      ],
      totalCount: 1,
      offset: 0,
      limit: 10,
    });

    const detailResponse = createResponse();
    await getArticle(
      request({ params: { id: '11' }, query: {}, headers: {} }),
      detailResponse.response,
    );
    assert.deepEqual(detailResponse.result().body, {
      id: 11,
      title: '게시글',
      content: '내용',
      image: null,
      likeCount: 2,
      createdAt,
      updatedAt,
      writer,
      isLiked: false,
    });
  } finally {
    restore.reverse().forEach((restoreMethod) => restoreMethod());
  }
});

test('article create and update responses expose writer without leaking userId', async () => {
  const restore = [
    replaceMethod(prisma.article, 'create', async (args) => mutatedArticle(args)),
    replaceMethod(prisma.article, 'findUnique', async () => ({ userId: writer.id })),
    replaceMethod(prisma.article, 'update', async (args) => mutatedArticle(args)),
  ];
  const authenticatedHeaders = { authorization: `Bearer ${token}` };

  try {
    const createResponseResult = createResponse();
    await createArticle(
      request({
        body: { title: '게시글', content: '내용' },
        headers: authenticatedHeaders,
        params: {},
        query: {},
      }),
      createResponseResult.response,
    );
    assert.deepEqual(createResponseResult.result(), {
      statusCode: 201,
      body: {
        id: 11,
        title: '게시글',
        content: '내용',
        image: null,
        likeCount: 2,
        createdAt,
        updatedAt,
        writer,
      },
    });

    const updateResponseResult = createResponse();
    await updateArticle(
      request({
        body: { title: '수정된 게시글' },
        headers: authenticatedHeaders,
        params: { id: '11' },
        query: {},
      }),
      updateResponseResult.response,
    );
    assert.deepEqual(updateResponseResult.result().body, {
      id: 11,
      title: '게시글',
      content: '내용',
      image: null,
      likeCount: 2,
      createdAt,
      updatedAt,
      writer,
    });
  } finally {
    restore.reverse().forEach((restoreMethod) => restoreMethod());
  }
});

test('article comment list, create, and update responses expose writer identity', async () => {
  const commentSource = {
    id: 31,
    content: '댓글',
    articleId: articleSource.id,
    userId: writer.id,
    createdAt,
    updatedAt,
  };
  const selectedComment = (args: unknown) => {
    const { articleId: _articleId, userId: _userId, updatedAt: _updatedAt, ...comment } = commentSource;
    return hasSelectedUser(args) ? { ...comment, user: writer } : comment;
  };
  const mutatedComment = (args: unknown) =>
    hasSelectedUser(args) ? { ...commentSource, user: writer } : commentSource;
  const restore = [
    replaceMethod(prisma.article, 'findUnique', async () => ({ id: articleSource.id })),
    replaceMethod(prisma.articleComment, 'findMany', async (args) => [selectedComment(args)]),
    replaceMethod(prisma.articleComment, 'create', async (args) => mutatedComment(args)),
    replaceMethod(prisma.articleComment, 'findUnique', async () => ({
      articleId: articleSource.id,
      userId: writer.id,
    })),
    replaceMethod(prisma.articleComment, 'update', async (args) => mutatedComment(args)),
  ];
  const authenticatedHeaders = { authorization: `Bearer ${token}` };

  try {
    const listResponse = createResponse();
    await getArticleComments(
      request({ params: { articleId: String(articleSource.id) }, query: {}, headers: {} }),
      listResponse.response,
    );
    assert.deepEqual(listResponse.result().body, {
      list: [{ id: 31, content: '댓글', createdAt, writer }],
      nextCursor: null,
    });

    const createResponseResult = createResponse();
    await createArticleComment(
      request({
        params: { articleId: String(articleSource.id) },
        query: {},
        body: { content: '댓글' },
        headers: authenticatedHeaders,
      }),
      createResponseResult.response,
    );
    assert.deepEqual(createResponseResult.result(), {
      statusCode: 201,
      body: { id: 31, content: '댓글', articleId: 11, createdAt, updatedAt, writer },
    });

    const updateResponseResult = createResponse();
    await updateArticleComment(
      request({
        params: { articleId: String(articleSource.id), commentId: '31' },
        query: {},
        body: { content: '수정 댓글' },
        headers: authenticatedHeaders,
      }),
      updateResponseResult.response,
    );
    assert.deepEqual(updateResponseResult.result().body, {
      id: 31,
      content: '댓글',
      articleId: 11,
      createdAt,
      updatedAt,
      writer,
    });
  } finally {
    restore.reverse().forEach((restoreMethod) => restoreMethod());
  }
});
