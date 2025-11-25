
import { Request, Response } from 'express';
import { PollVote, QuizSubmission, Poll, Quiz } from '../db';

export const submitVote = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { itemId, itemType, optionIds } = req.body;

    try {
        // Find the Poll based on itemId (announcement/news/library)
        // DB Schema has `announcementId`, `newsItemId`...
        const whereClause: any = {};
        if (itemType === 'announcement') whereClause.announcementId = itemId;
        else if (itemType === 'news') whereClause.newsItemId = itemId;
        else if (itemType === 'library') whereClause.libraryPostId = itemId;
        else return res.status(400).json({ message: 'Invalid item type' });

        const poll = await Poll.findOne({ where: whereClause });
        if (!poll) return res.status(404).json({ message: 'Poll not found' });

        // Remove existing vote
        await PollVote.destroy({
            where: {
                pollId: poll.getDataValue('id'),
                userId: currentUser.id
            }
        });

        // Create new vote
        await PollVote.create({
            pollId: poll.getDataValue('id'),
            userId: currentUser.id,
            optionIds: optionIds
        });

        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error submitting vote' });
    }
};

export const submitQuizAnswer = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { itemId, itemType, optionIds } = req.body;

    try {
        const whereClause: any = {};
        if (itemType === 'announcement') whereClause.announcementId = itemId;
        else if (itemType === 'news') whereClause.newsItemId = itemId;
        else if (itemType === 'library') whereClause.libraryPostId = itemId;
        else return res.status(400).json({ message: 'Invalid item type' });

        const quiz = await Quiz.findOne({ where: whereClause });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        await QuizSubmission.destroy({
            where: {
                quizId: quiz.getDataValue('id'),
                userId: currentUser.id
            }
        });

        await QuizSubmission.create({
            quizId: quiz.getDataValue('id'),
            userId: currentUser.id,
            optionIds: optionIds
        });

        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error submitting quiz' });
    }
};
