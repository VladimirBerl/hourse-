
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
                await PostImage.bulkCreate(images.map((img: any) => {
                    // Extract only valid PostImage fields (exclude id which is auto-generated)
                    const { id, ...imageData } = img;
                    return { ...imageData, newsItemId };
                }), { transaction: t });
            }

            if (poll) {
                const newPoll = await Poll.create({ ...poll, newsItemId }, { transaction: t });
                if (poll.options && poll.options.length > 0) {
                    await PollOption.bulkCreate(poll.options.map((opt: any) => ({ ...opt, pollId: newPoll.getDataValue('id') })), { transaction: t });
                }
            }

            if (quiz) {
                // Extract only valid Quiz fields (exclude id, options, submissions which are handled separately)
                const { id, options, submissions, correctOptionIds, ...quizData } = quiz;
                const newQuiz = await Quiz.create({ ...quizData, newsItemId, correctOptionIds: [] }, { transaction: t });
                const quizId = newQuiz.getDataValue('id');
                
                if (options && options.length > 0) {
                    // Create options and build mapping from temporary IDs to real IDs
                    const tempIdToRealIdMap: Record<string, string> = {};
                    const createdOptions = [];
                    
                    for (const opt of options) {
                        const { id: tempId, ...optionData } = opt;
                        const createdOption = await QuizOption.create({ ...optionData, quizId }, { transaction: t });
                        const realId = createdOption.getDataValue('id');
                        tempIdToRealIdMap[tempId] = realId;
                        createdOptions.push(createdOption);
                    }
                    
                    // Map correctOptionIds from temporary IDs to real IDs
                    const realCorrectOptionIds = correctOptionIds
                        ? correctOptionIds.map((tempId: string) => tempIdToRealIdMap[tempId]).filter(Boolean)
                        : [];
                    
                    // Update quiz with correct option IDs
                    await newQuiz.update({ correctOptionIds: realCorrectOptionIds }, { transaction: t });
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
                    await PostImage.bulkCreate(images.map((img: any) => {
                        // Extract only valid PostImage fields (exclude id which is auto-generated)
                        const { id: imgId, ...imageData } = img;
                        return { ...imageData, newsItemId: id };
                    }), { transaction: tx });
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
