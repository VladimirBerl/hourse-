import { Router } from 'express';
import {
  getAllUsers,
  updateUser,
  deleteUser,
  updateUserAndId,
  sendLinkRequest,
  respondToLinkRequest,
  updateUserRead,
} from '../handlers/user';
import { protect } from '../modules/auth';

const router = Router();

// GET /api/users - Получить всех пользователей
router.get('/', protect, getAllUsers);

router.put('/:id/update-read-timestamp', protect, updateUserRead);
// PUT /api/users/:id - Обновить пользователя
router.put('/:id', protect, updateUser);

// POST /api/users/update-id/:oldId - Admin special update
router.post('/update-id/:oldId', protect, updateUserAndId);

// POST /api/users/:id/request-link - Отправить запрос на привязку
router.post('/:id/request-link', protect, sendLinkRequest);

// POST /api/users/:id/respond-link-request - Принять/отклонить запрос на привязку
router.post('/:id/respond-link-request', protect, respondToLinkRequest);

// DELETE /api/users/:id - Удалить пользователя
router.delete('/:id', protect, deleteUser);

export default router;
