
import { Request, Response } from 'express';
import { DeveloperMessage } from '../db';

export const getAllMessages = async (req: any, res: any) => {
    const { user: currentUser } = req;
    try {
        // Admins can see all messages, regular users can only see their own messages
        const whereClause = currentUser.role === 'Admin' 
            ? {} 
            : { senderId: currentUser.id };
        
        const messages = await DeveloperMessage.findAll({
            where: whereClause,
            order: [['timestamp', 'DESC']]
        });
        res.status(200).json(messages);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching messages.' });
    }
};

export const addMessage = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { subject, message } = req.body;
    try {
        await DeveloperMessage.create({
            subject,
            message,
            senderId: currentUser.id,
        });
        res.status(201).json({ message: 'Message sent successfully.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error sending message.' });
    }
};

export const updateMessage = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;
    const { ...updateData } = req.body;

    if (currentUser.role !== 'Admin') {
        return res.status(403).json({ message: 'Forbidden.' });
    }
    
    try {
        const msg = await DeveloperMessage.findByPk(id);
        if (msg) {
            await msg.update(updateData);
            res.status(200).json({ message: 'Message updated successfully.' });
        } else {
            res.status(404).json({ message: 'Message not found' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error updating message.' });
    }
};

export const deleteMessage = async (req: any, res: any) => {
    const { id } = req.params;
    const { user: currentUser } = req;

    if (currentUser.role !== 'Admin') {
        return res.status(403).json({ message: 'Forbidden.' });
    }

    try {
        await DeveloperMessage.destroy({ where: { id } });
        res.status(200).json({ message: 'Message deleted successfully.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error deleting message.' });
    }
};
