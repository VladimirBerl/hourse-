
import { Request, Response } from 'express';
import { TrainingSession, TrainingParticipant, User } from '../db';

export const getAllTrainings = async (req: any, res: any) => {
    try {
        const trainings = await TrainingSession.findAll({
             include: [{ model: TrainingParticipant, as: 'participants' }]
        });
        res.status(200).json(trainings);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching trainings.' });
    }
};

export const addTraining = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { partnerId, creatorRoleForSession, ...trainingData } = req.body;

    try {
        const newTraining = await TrainingSession.create({
            ...trainingData,
            authorId: currentUser.id,
        });

        await TrainingParticipant.create({
            sessionId: newTraining.getDataValue('id'),
            userId: currentUser.id,
            confirmed: true,
            role: creatorRoleForSession || currentUser.role
        });

        if (partnerId) {
            const partner = await User.findByPk(partnerId);
            if (partner) {
                let partnerRoleInSession = partner.getDataValue('role');
                if (currentUser.role === 'Trainer' && partnerRoleInSession === 'Trainer' && creatorRoleForSession) {
                    partnerRoleInSession = (creatorRoleForSession === 'Trainer') ? 'Student' : 'Trainer';
                }
                await TrainingParticipant.create({
                    sessionId: newTraining.getDataValue('id'),
                    userId: partnerId,
                    confirmed: false,
                    role: partnerRoleInSession
                });
            }
        }

        const allTrainings = await TrainingSession.findAll({
            include: [{ model: TrainingParticipant, as: 'participants' }]
        });
        res.status(201).json(allTrainings);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error creating training.' });
    }
};

export const updateTraining = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;
    
    try {
        const training = await TrainingSession.findByPk(id, { include: [{ model: TrainingParticipant, as: 'participants' }] });

        if (!training) {
            return res.status(404).json({ message: 'Training not found.' });
        }
        
        const participants = training.getDataValue('participants') as any[];
        const isParticipant = participants.some(p => p.userId === currentUser.id);
        
        if (!isParticipant && currentUser.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden: Not a participant or admin.' });
        }

        const { participants: newParticipantsData, ...updateData } = req.body;
        
        await training.update(updateData);

        if (newParticipantsData) {
            // Replace participants logic
            await TrainingParticipant.destroy({ where: { sessionId: id } });
            const participantsToCreate = newParticipantsData.map(({ userId, confirmed, role }: any) => ({
                sessionId: id,
                userId,
                confirmed,
                role
            }));
            await TrainingParticipant.bulkCreate(participantsToCreate);
        }

        const allTrainings = await TrainingSession.findAll({
            include: [{ model: TrainingParticipant, as: 'participants' }]
        });
        res.status(200).json(allTrainings);
        
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error updating training.' });
    }
};

export const deleteTraining = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;
    
    try {
        const training = await TrainingSession.findByPk(id, { include: [{ model: TrainingParticipant, as: 'participants' }] });

        if (!training) {
            return res.status(404).json({ message: 'Training not found.' });
        }

        const participants = training.getDataValue('participants') as any[];
        const isParticipant = participants.some(p => p.userId === currentUser.id);

        if (!isParticipant && currentUser.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden: Not a participant or admin.' });
        }

        await training.destroy();

        const allTrainings = await TrainingSession.findAll({
            include: [{ model: TrainingParticipant, as: 'participants' }]
        });
        res.status(200).json(allTrainings);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error deleting training.' });
    }
};
