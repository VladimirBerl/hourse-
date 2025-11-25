import { Router } from 'express';
import { register, login, verifyToken } from '../handlers/user';
import { protect } from '../modules/auth';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify a token and get user data
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/verify', protect, verifyToken);

export default router;
