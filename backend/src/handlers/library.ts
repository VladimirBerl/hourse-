
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
               await PostImage.bulkCreate(images.map((img: any) => {
                    // Extract only valid PostImage fields (exclude id which is auto-generated)
                    const { id, ...imageData } = img;
                    return { ...imageData, libraryPostId };
                }), { transaction: t });
            }

            if (poll) {
                const newPoll = await Poll.create({ ...poll, libraryPostId }, { transaction: t });
                if (poll.options && poll.options.length > 0) {
                    await PollOption.bulkCreate(poll.options.map((opt: any) => ({ ...opt, pollId: newPoll.getDataValue('id') })), { transaction: t });
                }
            }

            if (quiz) {
                // Extract only valid Quiz fields (exclude id, options, submissions which are handled separately)
                const { id, options, submissions, correctOptionIds, ...quizData } = quiz;
                const newQuiz = await Quiz.create({ ...quizData, libraryPostId, correctOptionIds: [] }, { transaction: t });
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
                     await PostImage.bulkCreate(images.map((img: any) => {
                        // Extract only valid PostImage fields (exclude id which is auto-generated)
                        const { id: imgId, ...imageData } = img;
                        return { ...imageData, libraryPostId: id };
                    }), { transaction: tx });
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
