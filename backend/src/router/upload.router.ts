
import express, { Request, Response } from 'express';
import upload from '../modules/upload';
import { protect } from '../modules/auth';

const router = express.Router();

router.post('/', protect, upload.single('file'), (req: any, res: any) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Путь, доступный для фронтенда
    const filePath = `/uploads/${req.file.filename}`;

    res.status(201).json({ filePath });
});

export default router;
