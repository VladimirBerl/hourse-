import { Router } from 'express';
import { getAllAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement } from '../handlers/announcement';
import { protect } from '../modules/auth';

const router = Router();

router.get('/', protect, getAllAnnouncements);
router.post('/', protect, addAnnouncement);
router.put('/:id', protect, updateAnnouncement);
router.delete('/:id', protect, deleteAnnouncement);

export default router;
