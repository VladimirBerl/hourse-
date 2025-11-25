
import { Router } from 'express';
import { 
    getAllPasswordResetRequests, submitPasswordResetRequest, resolvePasswordResetRequest, deletePasswordResetRequest,
    getAllNewLocationRequests, resolveNewLocationRequest
} from '../handlers/request';
import { protect } from '../modules/auth';

const router = Router();

// Password Reset
router.get('/password-reset', protect, getAllPasswordResetRequests);
router.post('/password-reset/submit', submitPasswordResetRequest); // Public (requires email)
router.post('/password-reset/resolve', protect, resolvePasswordResetRequest);
router.delete('/password-reset/:id', protect, deletePasswordResetRequest);

// Location
router.get('/location', protect, getAllNewLocationRequests);
router.post('/location/resolve', protect, resolveNewLocationRequest);

export default router;
