
import { Request, Response } from 'express';
import { NewsItem, PostImage, Poll, PollOption, PollVote, Quiz, QuizOption, QuizSubmission } from '../db';
import sequelize from '../db';

const includeOptions = [
    { model: PostImage, as: 'images' },
    { 
        model: Poll, 
        as: 'poll', 
        include: [
            { model: PollOption, as: 'options' }, 
            { model: PollVote, as: 'votes' }
        ] 
    },
    { 
        model: Quiz, 
        as: 'quiz', 
        include: [
            { model: QuizOption, as: 'options' }, 
            { model: QuizSubmission, as: 'submissions' }
        ] 
    }
];

export const getAllNews = async (req: any, res: any) => {
    try {
        const news = await NewsItem.findAll({ include: includeOptions });
        res.status(200).json(news);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching news.' });
    }
};

export const addNewsItem = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { images, poll, quiz, ...data } = req.body;

    if (currentUser.role !== 'Admin') {
        return res.status(403).json({ message: 'Forbidden.' });
    }

    try {
        await sequelize.transaction(async (t) => {
            const newItem = await NewsItem.create({
                ...data,
                authorId: currentUser.id,
            }, { transaction: t });

            const newsItemId = newItem.getDataValue('id');

            if (images && images.length > 0) {
                await PostImage.bulkCreate(images.map((img: any) => ({ ...img, newsItemId })), { transaction: t });
            }

            if (poll) {
                const newPoll = await Poll.create({ ...poll, newsItemId }, { transaction: t });
                if (poll.options && poll.options.length > 0) {
                    await PollOption.bulkCreate(poll.options.map((opt: any) => ({ ...opt, pollId: newPoll.getDataValue('id') })), { transaction: t });
                }
            }

            if (quiz) {
                const newQuiz = await Quiz.create({ ...quiz, newsItemId }, { transaction: t });
                if (quiz.options && quiz.options.length > 0) {
                    await QuizOption.bulkCreate(quiz.options.map((opt: any) => ({ ...opt, quizId: newQuiz.getDataValue('id') })), { transaction: t });
                }
            }
        });
        
        const allNews = await NewsItem.findAll({ include: includeOptions });
        res.status(201).json(allNews);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error creating news item.' });
    }
};

export const updateNewsItem = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;
    const { images, poll, quiz, ...updateData } = req.body;
    
    try {
        const newsItem = await NewsItem.findByPk(id);
        if (!newsItem) {
            return res.status(404).json({ message: 'News item not found.' });
        }

        if (newsItem.getDataValue('authorId') !== currentUser.id && currentUser.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden.' });
        }
        
        await sequelize.transaction(async (tx) => {
            await newsItem.update(updateData, { transaction: tx });

            if (images !== undefined) {
                await PostImage.destroy({ where: { newsItemId: id }, transaction: tx });
                if (images.length > 0) {
                    await PostImage.bulkCreate(images.map((img: any) => ({ url: img.url, position: img.position, newsItemId: id })), { transaction: tx });
                }
            }
            // Logic for poll/quiz update can be duplicated from announcements if needed full feature parity
        });

        const allNews = await NewsItem.findAll({ include: includeOptions });
        res.status(200).json(allNews);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error updating news item.' });
    }
};

export const deleteNewsItem = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;

    try {
        const newsItem = await NewsItem.findByPk(id);
        if (!newsItem) {
            return res.status(404).json({ message: 'News item not found.' });
        }
        if (newsItem.getDataValue('authorId') !== currentUser.id && currentUser.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden.' });
        }

        await newsItem.destroy();
        
        const allNews = await NewsItem.findAll({ include: includeOptions });
        res.status(200).json(allNews);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error deleting news item.' });
    }
};
