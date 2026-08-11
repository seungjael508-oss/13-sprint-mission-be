import { Router } from 'express';
import {
  createArticle,
  deleteArticle,
  getArticle,
  getArticles,
  likeArticle,
  unlikeArticle,
  updateArticle,
} from '../controllers/articleController.js';
import {
  createArticleComment,
  deleteArticleComment,
  getArticleComments,
  updateArticleComment,
} from '../controllers/articleCommentController.js';

const router = Router();

router.get('/', getArticles);
router.post('/', createArticle);
router.get('/:id', getArticle);
router.patch('/:id', updateArticle);
router.delete('/:id', deleteArticle);
router.post('/:articleId/like', likeArticle);
router.delete('/:articleId/like', unlikeArticle);

router.post('/:articleId/comments', createArticleComment);
router.get('/:articleId/comments', getArticleComments);
router.patch('/:articleId/comments/:commentId', updateArticleComment);
router.delete('/:articleId/comments/:commentId', deleteArticleComment);

export default router;
