
import { Router } from 'express';
import { getAllUsers, updateUser, deleteUser, updateUserAndId } from '../handlers/user';
import { protect } from '../modules/auth';

const router = Router();

// GET /api/users - Получить всех пользователей
router.get('/', protect, getAllUsers);

// PUT /api/users/:id - Обновить пользователя
router.put('/:id', protect, updateUser);

// POST /api/users/update-id/:oldId - Admin special update
router.post('/update-id/:oldId', protect, updateUserAndId);

// DELETE /api/users/:id - Удалить пользователя
router.delete('/:id', protect, deleteUser);

export default router;
