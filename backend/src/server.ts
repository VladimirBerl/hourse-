
import express, { Request, Response } from 'express';
import * as dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import sequelize from './db'; // Import sequelize instance
import { seedDatabase } from './seed'; // Import seed function
import { Announcement, NewsItem, LibraryPost, PostImage, Poll, PollOption, Quiz, QuizOption } from './db';
import { Op } from 'sequelize';

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
sequelize.authenticate().then(async () => {
    console.log('Database connection established successfully.');
    
    // Sync database - create tables if they don't exist
    await sequelize.sync({ alter: true });
    console.log('Database synced via Sequelize');
    
    // Seed database with initial admins
    await seedDatabase();

    // Auto-delete posts with expired deletionTimestamp
    const autoDeletePosts = async () => {
        try {
            const now = new Date();
            
            // Delete announcements
            const expiredAnnouncements = await Announcement.findAll({
                where: {
                    deletionTimestamp: {
                        [Op.lte]: now
                    }
                }
            });
            
            for (const announcement of expiredAnnouncements) {
                const announcementId = announcement.getDataValue('id');
                
                // Delete related data
                await PostImage.destroy({ where: { announcementId } });
                const poll = await Poll.findOne({ where: { announcementId } });
                if (poll) {
                    const pollId = poll.getDataValue('id');
                    await PollOption.destroy({ where: { pollId } });
                    await poll.destroy();
                }
                const quiz = await Quiz.findOne({ where: { announcementId } });
                if (quiz) {
                    const quizId = quiz.getDataValue('id');
                    await QuizOption.destroy({ where: { quizId } });
                    await quiz.destroy();
                }
                
                await announcement.destroy();
            }
            
            if (expiredAnnouncements.length > 0) {
                console.log(`Auto-deleted ${expiredAnnouncements.length} expired announcement(s).`);
            }
            
            // Delete news items
            const expiredNews = await NewsItem.findAll({
                where: {
                    deletionTimestamp: {
                        [Op.lte]: now
                    }
                }
            });
            
            for (const newsItem of expiredNews) {
                const newsItemId = newsItem.getDataValue('id');
                
                // Delete related data
                await PostImage.destroy({ where: { newsItemId } });
                const poll = await Poll.findOne({ where: { newsItemId } });
                if (poll) {
                    const pollId = poll.getDataValue('id');
                    await PollOption.destroy({ where: { pollId } });
                    await poll.destroy();
                }
                const quiz = await Quiz.findOne({ where: { newsItemId } });
                if (quiz) {
                    const quizId = quiz.getDataValue('id');
                    await QuizOption.destroy({ where: { quizId } });
                    await quiz.destroy();
                }
                
                await newsItem.destroy();
            }
            
            if (expiredNews.length > 0) {
                console.log(`Auto-deleted ${expiredNews.length} expired news item(s).`);
            }
            
            // Delete library posts
            const expiredLibraryPosts = await LibraryPost.findAll({
                where: {
                    deletionTimestamp: {
                        [Op.lte]: now
                    }
                }
            });
            
            for (const libraryPost of expiredLibraryPosts) {
                const libraryPostId = libraryPost.getDataValue('id');
                
                // Delete related data
                await PostImage.destroy({ where: { libraryPostId } });
                const poll = await Poll.findOne({ where: { libraryPostId } });
                if (poll) {
                    const pollId = poll.getDataValue('id');
                    await PollOption.destroy({ where: { pollId } });
                    await poll.destroy();
                }
                const quiz = await Quiz.findOne({ where: { libraryPostId } });
                if (quiz) {
                    const quizId = quiz.getDataValue('id');
                    await QuizOption.destroy({ where: { quizId } });
                    await quiz.destroy();
                }
                
                await libraryPost.destroy();
            }
            
            if (expiredLibraryPosts.length > 0) {
                console.log(`Auto-deleted ${expiredLibraryPosts.length} expired library post(s).`);
            }
        } catch (error) {
            console.error('Error during auto-deletion of posts:', error);
        }
    };
    
    // Run auto-deletion immediately on startup, then every hour
    await autoDeletePosts();
    setInterval(autoDeletePosts, 60 * 60 * 1000); // Check every hour

    httpServer.listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
    });
}).catch((err) => {
    console.error('Failed to sync database:', err);
    process.exit(1);
});
