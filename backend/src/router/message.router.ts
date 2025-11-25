import { Router } from 'express';
import { getAllMessages, addMessage, updateMessage, deleteMessage } from '../handlers/message';
import { protect } from '../modules/auth';

const router = Router();

// "messages" refer to Developer Messages (tech support)
router.get('/', protect, getAllMessages);
router.post('/', protect, addMessage);
router.put('/:id', protect, updateMessage);
router.delete('/:id', protect, deleteMessage);

export default router;
