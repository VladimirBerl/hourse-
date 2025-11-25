import { Router } from 'express';
import { getConversations, getAllChatMessages, sendMessage, findOrCreateConversation } from '../handlers/chat';
import { protect } from '../modules/auth';

const router = Router();

router.get('/conversations', protect, getConversations);
router.get('/messages', protect, getAllChatMessages);
router.post('/messages', protect, sendMessage);
router.post('/conversations/find-or-create', protect, findOrCreateConversation);

export default router;
