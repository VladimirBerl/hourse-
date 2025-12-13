
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
                await PostImage.bulkCreate(images.map((img: any) => {
                    // Extract only valid PostImage fields (exclude id which is auto-generated)
                    const { id, ...imageData } = img;
                    return { ...imageData, announcementId };
                }), { transaction: t });
            }

            if (poll) {
                // Extract only valid Poll fields (exclude id, options, votes which are handled separately)
                const { id, options, votes, ...pollData } = poll;
                // Convert pollEndsAt string to Date if present
                if (pollData.pollEndsAt && typeof pollData.pollEndsAt === 'string') {
                    pollData.pollEndsAt = new Date(pollData.pollEndsAt);
                }
                const newPoll = await Poll.create({ ...pollData, announcementId }, { transaction: t });
                if (options && options.length > 0) {
                    await PollOption.bulkCreate(options.map((opt: any) => {
                        // Extract only valid PollOption fields (exclude id)
                        const { id: optId, ...optionData } = opt;
                        return { ...optionData, pollId: newPoll.getDataValue('id') };
                    }), { transaction: t });
                }
            }

            if (quiz) {
                // Extract only valid Quiz fields (exclude id, options, submissions which are handled separately)
                const { id, options, submissions, correctOptionIds, ...quizData } = quiz;
                const newQuiz = await Quiz.create({ ...quizData, announcementId, correctOptionIds: [] }, { transaction: t });
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
            return newAnnouncement;
        });
        
        const allAnnouncements = await Announcement.findAll({ include: includeOptions });
        res.status(201).json(allAnnouncements);

    } catch (e) {
        console.error('Error creating announcement:', e);
        res.status(500).json({ message: 'Error creating announcement.', error: e instanceof Error ? e.message : String(e) });
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
                    await PostImage.bulkCreate(images.map((img: any) => {
                        // Extract only valid PostImage fields (exclude id which is auto-generated)
                        const { id: imgId, ...imageData } = img;
                        return { ...imageData, announcementId: id };
                    }), { transaction: tx });
                }
            }

            if (poll !== undefined) {
                const existingPoll = await Poll.findOne({ where: { announcementId: id }, transaction: tx });
                if (poll === null || poll === false) {
                    // Delete poll if poll is null or false
                    if (existingPoll) {
                        await PollOption.destroy({ where: { pollId: existingPoll.getDataValue('id') }, transaction: tx });
                        await existingPoll.destroy({ transaction: tx });
                    }
                } else if (existingPoll) {
                    await PollOption.destroy({ where: { pollId: existingPoll.getDataValue('id') }, transaction: tx });
                    // Extract only valid Poll fields
                    const { id: pollId, options, votes, ...pollData } = poll;
                    // Convert pollEndsAt string to Date if present
                    if (pollData.pollEndsAt && typeof pollData.pollEndsAt === 'string') {
                        pollData.pollEndsAt = new Date(pollData.pollEndsAt);
                    }
                    await existingPoll.update(pollData, { transaction: tx });
                    if (options) {
                        await PollOption.bulkCreate(options.map((opt: any) => {
                            const { id: optId, ...optionData } = opt;
                            return { ...optionData, pollId: existingPoll.getDataValue('id') };
                        }), { transaction: tx });
                    }
                } else {
                    // Extract only valid Poll fields
                    const { id: pollId, options, votes, ...pollData } = poll;
                    // Convert pollEndsAt string to Date if present
                    if (pollData.pollEndsAt && typeof pollData.pollEndsAt === 'string') {
                        pollData.pollEndsAt = new Date(pollData.pollEndsAt);
                    }
                    const newPoll = await Poll.create({ ...pollData, announcementId: id }, { transaction: tx });
                    if (options) {
                        await PollOption.bulkCreate(options.map((opt: any) => {
                            const { id: optId, ...optionData } = opt;
                            return { ...optionData, pollId: newPoll.getDataValue('id') };
                        }), { transaction: tx });
                    }
                }
            }

            if (quiz !== undefined) {
                const existingQuiz = await Quiz.findOne({ where: { announcementId: id }, transaction: tx });
                if (quiz === null || quiz === false) {
                    // Delete quiz if quiz is null or false
                    if (existingQuiz) {
                        await QuizOption.destroy({ where: { quizId: existingQuiz.getDataValue('id') }, transaction: tx });
                        await existingQuiz.destroy({ transaction: tx });
                    }
                } else if (existingQuiz) {
                    await QuizOption.destroy({ where: { quizId: existingQuiz.getDataValue('id') }, transaction: tx });
                    // Extract only valid Quiz fields
                    const { id: quizIdParam, options, submissions, correctOptionIds, ...quizData } = quiz;
                    const existingQuizId = existingQuiz.getDataValue('id');
                    
                    // Create options and build mapping from temporary IDs to real IDs
                    const tempIdToRealIdMap: Record<string, string> = {};
                    
                    if (options && options.length > 0) {
                        for (const opt of options) {
                            const { id: tempId, ...optionData } = opt;
                            const createdOption = await QuizOption.create({ ...optionData, quizId: existingQuizId }, { transaction: tx });
                            const realId = createdOption.getDataValue('id');
                            tempIdToRealIdMap[tempId] = realId;
                        }
                    }
                    
                    // Map correctOptionIds from temporary IDs to real IDs
                    const realCorrectOptionIds = correctOptionIds
                        ? correctOptionIds.map((tempId: string) => tempIdToRealIdMap[tempId]).filter(Boolean)
                        : [];
                    
                    // Update quiz with correct option IDs
                    await existingQuiz.update({ ...quizData, correctOptionIds: realCorrectOptionIds }, { transaction: tx });
                } else {
                    // Extract only valid Quiz fields
                    const { id: quizIdParam, options, submissions, correctOptionIds, ...quizData } = quiz;
                    const newQuiz = await Quiz.create({ ...quizData, announcementId: id, correctOptionIds: [] }, { transaction: tx });
                    const newQuizId = newQuiz.getDataValue('id');
                    
                    // Create options and build mapping from temporary IDs to real IDs
                    const tempIdToRealIdMap: Record<string, string> = {};
                    
                    if (options && options.length > 0) {
                        for (const opt of options) {
                            const { id: tempId, ...optionData } = opt;
                            const createdOption = await QuizOption.create({ ...optionData, quizId: newQuizId }, { transaction: tx });
                            const realId = createdOption.getDataValue('id');
                            tempIdToRealIdMap[tempId] = realId;
                        }
                    }
                    
                    // Map correctOptionIds from temporary IDs to real IDs
                    const realCorrectOptionIds = correctOptionIds
                        ? correctOptionIds.map((tempId: string) => tempIdToRealIdMap[tempId]).filter(Boolean)
                        : [];
                    
                    // Update quiz with correct option IDs
                    await newQuiz.update({ correctOptionIds: realCorrectOptionIds }, { transaction: tx });
                }
            }
        });

        const allAnnouncements = await Announcement.findAll({ include: includeOptions });
        res.status(200).json(allAnnouncements);

    } catch (e) {
        console.error('Error updating announcement:', e);
        res.status(500).json({ message: 'Error updating announcement.', error: e instanceof Error ? e.message : String(e) });
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
