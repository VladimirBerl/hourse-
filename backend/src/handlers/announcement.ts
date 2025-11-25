
import { Request, Response } from 'express';
import { Announcement, PostImage, Poll, PollOption, PollVote, Quiz, QuizOption, QuizSubmission } from '../db';
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

export const getAllAnnouncements = async (req: any, res: any) => {
    try {
        const announcements = await Announcement.findAll({
            include: includeOptions
        });
        res.status(200).json(announcements);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching announcements.' });
    }
};

export const addAnnouncement = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { images, poll, quiz, ...data } = req.body;

    try {
        const isUserSubmission = currentUser.role !== 'Admin';
        const status = isUserSubmission ? 'pending' : 'published';

        const result = await sequelize.transaction(async (t) => {
            const newAnnouncement = await Announcement.create({
                ...data,
                status,
                authorId: currentUser.id,
                submittedById: isUserSubmission ? currentUser.id : null,
            }, { transaction: t });

            const announcementId = newAnnouncement.getDataValue('id');

            if (images && images.length > 0) {
                await PostImage.bulkCreate(images.map((img: any) => ({ ...img, announcementId })), { transaction: t });
            }

            if (poll) {
                const newPoll = await Poll.create({ ...poll, announcementId }, { transaction: t });
                if (poll.options && poll.options.length > 0) {
                    await PollOption.bulkCreate(poll.options.map((opt: any) => ({ ...opt, pollId: newPoll.getDataValue('id') })), { transaction: t });
                }
            }

            if (quiz) {
                const newQuiz = await Quiz.create({ ...quiz, announcementId }, { transaction: t });
                if (quiz.options && quiz.options.length > 0) {
                    await QuizOption.bulkCreate(quiz.options.map((opt: any) => ({ ...opt, quizId: newQuiz.getDataValue('id') })), { transaction: t });
                }
            }
            return newAnnouncement;
        });
        
        const allAnnouncements = await Announcement.findAll({ include: includeOptions });
        res.status(201).json(allAnnouncements);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error creating announcement.' });
    }
};

export const updateAnnouncement = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;
    const { images, poll, quiz, ...updateData } = req.body;
    
    try {
        const announcement = await Announcement.findByPk(id);
        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found.' });
        }

        if (announcement.getDataValue('authorId') !== currentUser.id && currentUser.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden.' });
        }
        
        await sequelize.transaction(async (tx) => {
            await announcement.update(updateData, { transaction: tx });

            if (images !== undefined) {
                await PostImage.destroy({ where: { announcementId: id }, transaction: tx });
                if (images.length > 0) {
                    await PostImage.bulkCreate(images.map((img: any) => ({ ...img, announcementId: id })), { transaction: tx });
                }
            }

            if (poll !== undefined) {
                const existingPoll = await Poll.findOne({ where: { announcementId: id }, transaction: tx });
                if (existingPoll) {
                    await PollOption.destroy({ where: { pollId: existingPoll.getDataValue('id') }, transaction: tx });
                    await existingPoll.update(poll, { transaction: tx });
                    if (poll.options) {
                        await PollOption.bulkCreate(poll.options.map((opt: any) => ({ ...opt, pollId: existingPoll.getDataValue('id') })), { transaction: tx });
                    }
                } else if (poll) {
                    const newPoll = await Poll.create({ ...poll, announcementId: id }, { transaction: tx });
                    if (poll.options) {
                        await PollOption.bulkCreate(poll.options.map((opt: any) => ({ ...opt, pollId: newPoll.getDataValue('id') })), { transaction: tx });
                    }
                }
            }

            if (quiz !== undefined) {
                const existingQuiz = await Quiz.findOne({ where: { announcementId: id }, transaction: tx });
                if (existingQuiz) {
                    await QuizOption.destroy({ where: { quizId: existingQuiz.getDataValue('id') }, transaction: tx });
                    await existingQuiz.update(quiz, { transaction: tx });
                    if (quiz.options) {
                        await QuizOption.bulkCreate(quiz.options.map((opt: any) => ({ ...opt, quizId: existingQuiz.getDataValue('id') })), { transaction: tx });
                    }
                } else if (quiz) {
                    const newQuiz = await Quiz.create({ ...quiz, announcementId: id }, { transaction: tx });
                    if (quiz.options) {
                        await QuizOption.bulkCreate(quiz.options.map((opt: any) => ({ ...opt, quizId: newQuiz.getDataValue('id') })), { transaction: tx });
                    }
                }
            }
        });

        const allAnnouncements = await Announcement.findAll({ include: includeOptions });
        res.status(200).json(allAnnouncements);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error updating announcement.' });
    }
};

export const deleteAnnouncement = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;

    try {
        const announcement = await Announcement.findByPk(id);
        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found.' });
        }
        if (announcement.getDataValue('authorId') !== currentUser.id && currentUser.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden.' });
        }

        await announcement.update({
            status: 'trashed',
            trashedTimestamp: new Date()
        });
        
        const allAnnouncements = await Announcement.findAll({ include: includeOptions });
        res.status(200).json(allAnnouncements);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error deleting announcement.' });
    }
};
