import { Router } from 'express';
import { getConversations, getAllChatMessages, sendMessage, findOrCreateConversation, markMessagesAsRead } from '../handlers/chat';
import { protect } from '../modules/auth';

const router = Router();

router.get('/conversations', protect, getConversations);
router.get('/messages', protect, getAllChatMessages);
router.post('/messages', protect, sendMessage);
router.put('/messages/mark-read', protect, markMessagesAsRead);
router.post('/conversations/find-or-create', protect, findOrCreateConversation);

export default router;
