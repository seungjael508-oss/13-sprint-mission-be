import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getBestProducts,
  getProduct,
  getProducts,
  likeProduct,
  unlikeProduct,
  updateProduct,
} from '../controllers/productController.js';
import {
  createProductComment,
  deleteProductComment,
  getProductComments,
  updateProductComment,
} from '../controllers/productCommentController.js';

const router = Router();

router.get('/', getProducts);
router.post('/', createProduct);
router.get('/best', getBestProducts);
router.get('/:id', getProduct);
router.patch('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:productId/like', likeProduct);
router.delete('/:productId/like', unlikeProduct);

router.post('/:productId/comments', createProductComment);
router.get('/:productId/comments', getProductComments);
router.patch('/:productId/comments/:commentId', updateProductComment);
router.delete('/:productId/comments/:commentId', deleteProductComment);

export default router;
