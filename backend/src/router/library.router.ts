import { Router } from 'express';
import { getAllLibraryPosts, addLibraryPost, updateLibraryPost, deleteLibraryPost } from '../handlers/library';
import { protect } from '../modules/auth';

const router = Router();

router.get('/', protect, getAllLibraryPosts);
router.post('/', protect, addLibraryPost);
router.put('/:id', protect, updateLibraryPost);
router.delete('/:id', protect, deleteLibraryPost);

export default router;
