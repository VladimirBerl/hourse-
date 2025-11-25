
import { Router } from 'express';
import { submitVote, submitQuizAnswer } from '../handlers/interaction';
import { protect } from '../modules/auth';

const router = Router();

router.post('/vote', protect, submitVote);
router.post('/quiz', protect, submitQuizAnswer);

export default router;
