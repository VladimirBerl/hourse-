
import { Router } from 'express';
import { 
    getSettings, updateSettings, 
    getLocations, updateLocations, 
    getWelcomeContent, updateWelcomeContent,
    getAllBonusTransactions, adminUpdateBonuses, expireBonuses
} from '../handlers/settings';
import { protect } from '../modules/auth';

const router = Router();

// Global Settings
router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);

// Locations
router.get('/locations', getLocations); // Public for registration? Or protect? Mock was implicit.
router.put('/locations', protect, updateLocations);

// Welcome Page
router.get('/welcome', getWelcomeContent);
router.put('/welcome', protect, updateWelcomeContent);

// Bonuses
router.get('/bonuses', protect, getAllBonusTransactions);
router.post('/bonuses/admin-update', protect, adminUpdateBonuses);
router.post('/bonuses/expire', protect, expireBonuses);

export default router;
