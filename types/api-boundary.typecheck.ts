import type { Response } from 'express';
import type { createArticleComment, deleteArticleComment, getArticleComments, updateArticleComment } from '../controllers/articleCommentController.js';
import type { createArticle, deleteArticle, getArticle, getArticles, likeArticle, unlikeArticle, updateArticle } from '../controllers/articleController.js';
import type { signIn, signUp } from '../controllers/authController.js';
import type { uploadImage } from '../controllers/imageController.js';
import type { createProductComment, deleteProductComment, getProductComments, updateProductComment } from '../controllers/productCommentController.js';
import type { createProduct, deleteProduct, getBestProducts, getProduct, getProducts, likeProduct, unlikeProduct, updateProduct } from '../controllers/productController.js';

type Controller =
  | typeof signUp
  | typeof signIn
  | typeof getArticles
  | typeof createArticle
  | typeof getArticle
  | typeof updateArticle
  | typeof deleteArticle
  | typeof likeArticle
  | typeof unlikeArticle
  | typeof createArticleComment
  | typeof getArticleComments
  | typeof updateArticleComment
  | typeof deleteArticleComment
  | typeof getProducts
  | typeof createProduct
  | typeof getProduct
  | typeof updateProduct
  | typeof getBestProducts
  | typeof likeProduct
  | typeof unlikeProduct
  | typeof deleteProduct
  | typeof createProductComment
  | typeof getProductComments
  | typeof updateProductComment
  | typeof deleteProductComment
  | typeof uploadImage;

type ParametersOf<T> = T extends (...args: infer TParameters) => unknown ? TParameters : never;
type RequestBodyOf<T> = ParametersOf<T>[0] extends { body: infer TBody } ? TBody : never;
type ResponseBodyOf<T> = ParametersOf<T>[1] extends Response<infer TBody> ? TBody : never;
type IsAny<T> = 0 extends 1 & T ? true : false;
type Assert<T extends true> = T;

type AllRequestBodiesAreExplicit = Assert<IsAny<RequestBodyOf<Controller>> extends false ? true : false>;
type AllResponseBodiesAreExplicit = Assert<IsAny<ResponseBodyOf<Controller>> extends false ? true : false>;

export type ApiBoundaryTypeContract = [
  AllRequestBodiesAreExplicit,
  AllResponseBodiesAreExplicit,
];
