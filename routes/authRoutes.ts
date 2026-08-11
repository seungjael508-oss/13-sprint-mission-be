import { Router } from 'express';
import { signIn, signUp } from '../controllers/authController.js';

const router = Router();

router.post('/signUp', signUp);
router.post('/signIn', signIn);

export default router;
