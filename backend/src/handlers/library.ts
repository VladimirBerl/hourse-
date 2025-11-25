
import { Request, Response } from 'express';
import { LibraryPost, PostImage, Poll, PollOption, PollVote, Quiz, QuizOption, QuizSubmission } from '../db';
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

export const getAllLibraryPosts = async (req: any, res: any) => {
    try {
        const posts = await LibraryPost.findAll({ include: includeOptions });
        res.status(200).json(posts);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching library posts.' });
    }
};

export const addLibraryPost = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { images, poll, quiz, ...data } = req.body;

    if (currentUser.role !== 'Admin') {
        return res.status(403).json({ message: 'Forbidden.' });
    }

    try {
        await sequelize.transaction(async (t) => {
            const newPost = await LibraryPost.create({
                ...data,
                authorId: currentUser.id,
            }, { transaction: t });

            const libraryPostId = newPost.getDataValue('id');

            if (images && images.length > 0) {
                await PostImage.bulkCreate(images.map((img: any) => ({ ...img, libraryPostId })), { transaction: t });
            }

            if (poll) {
                const newPoll = await Poll.create({ ...poll, libraryPostId }, { transaction: t });
                if (poll.options && poll.options.length > 0) {
                    await PollOption.bulkCreate(poll.options.map((opt: any) => ({ ...opt, pollId: newPoll.getDataValue('id') })), { transaction: t });
                }
            }

            if (quiz) {
                const newQuiz = await Quiz.create({ ...quiz, libraryPostId }, { transaction: t });
                if (quiz.options && quiz.options.length > 0) {
                    await QuizOption.bulkCreate(quiz.options.map((opt: any) => ({ ...opt, quizId: newQuiz.getDataValue('id') })), { transaction: t });
                }
            }
        });
        
        const allPosts = await LibraryPost.findAll({ include: includeOptions });
        res.status(201).json(allPosts);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error creating library post.' });
    }
};

export const updateLibraryPost = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;
    const { images, ...updateData } = req.body;
    
    try {
        const post = await LibraryPost.findByPk(id);
        if (!post) {
            return res.status(404).json({ message: 'Library post not found.' });
        }

        if (post.getDataValue('authorId') !== currentUser.id && currentUser.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden.' });
        }
        
        await sequelize.transaction(async (tx) => {
             await post.update(updateData, { transaction: tx });

             if (images !== undefined) {
                await PostImage.destroy({ where: { libraryPostId: id }, transaction: tx });
                if (images.length > 0) {
                     await PostImage.bulkCreate(images.map((img: any) => ({ url: img.url, position: img.position, libraryPostId: id })), { transaction: tx });
                }
            }
        });

        const allPosts = await LibraryPost.findAll({ include: includeOptions });
        res.status(200).json(allPosts);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error updating library post.' });
    }
};

export const deleteLibraryPost = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;

    try {
        const post = await LibraryPost.findByPk(id);
        if (!post) {
            return res.status(404).json({ message: 'Library post not found.' });
        }
        if (post.getDataValue('authorId') !== currentUser.id && currentUser.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden.' });
        }

        await post.destroy();
        
        const allPosts = await LibraryPost.findAll({ include: includeOptions });
        res.status(200).json(allPosts);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error deleting library post.' });
    }
};
