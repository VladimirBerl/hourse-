import { Router } from 'express';
import { getAllTrainings, addTraining, updateTraining, deleteTraining } from '../handlers/training';
import { protect } from '../modules/auth';

const router = Router();

router.get('/', protect, getAllTrainings);
router.post('/', protect, addTraining);
router.put('/:id', protect, updateTraining);
router.delete('/:id', protect, deleteTraining);

export default router;
