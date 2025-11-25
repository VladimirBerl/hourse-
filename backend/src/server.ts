
import express, { Request, Response } from 'express';
import * as dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import sequelize from './db'; // Import sequelize instance
import { seedDatabase } from './seed'; // Import seed function

import authRouter from './router/auth.router';
import userRouter from './router/user.router';
import trainingRouter from './router/training.router';
import announcementRouter from './router/announcement.router';
import newsRouter from './router/news.router';
import libraryRouter from './router/library.router';
import chatRouter from './router/chat.router';
import messageRouter from './router/message.router';
import uploadRouter from './router/upload.router';
import settingsRouter from './router/settings.router';
import interactionRouter from './router/interaction.router';
import requestRouter from './router/request.router';


const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
    }
});

io.on('connection', (socket) => {
    console.log('New client connected to socket.io');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Раздача статических файлов
app.use('/uploads', express.static(path.resolve('uploads')));

app.get('/', (req: any, res: any) => {
    res.json({ message: "Backend is running" });
});

// Подключаем роутеры
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/trainings', trainingRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/news', newsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/chat', chatRouter);
app.use('/api/messages', messageRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/interactions', interactionRouter);
app.use('/api/requests', requestRouter);


const port = process.env.PORT || 3001;

// Sync Database and start server
sequelize.sync({ alter: true }).then(async () => {
    console.log('Database synced via Sequelize');
    
    // Seed database with initial admins
    await seedDatabase();

    httpServer.listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
    });
}).catch((err) => {
    console.error('Failed to sync database:', err);
});
