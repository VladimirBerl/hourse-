import { Router } from 'express';
import { getAllNews, addNewsItem, updateNewsItem, deleteNewsItem } from '../handlers/news';
import { protect } from '../modules/auth';

const router = Router();

router.get('/', protect, getAllNews);
router.post('/', protect, addNewsItem);
router.put('/:id', protect, updateNewsItem);
router.delete('/:id', protect, deleteNewsItem);

export default router;
