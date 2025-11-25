
import { Request, Response } from 'express';
import { Conversation, ConversationParticipant, ChatMessage } from '../db';
import { Op } from 'sequelize';

export const getConversations = async (req: any, res: any) => {
    const { user: currentUser } = req;
    try {
        // Find conversations where user is a participant
        const conversations = await Conversation.findAll({
            include: [{
                model: ConversationParticipant,
                as: 'participants_join', // This alias isn't defined in association but standard belongsToMany include often uses the Model name or specific alias if defined.
                // Sequelize belongsToMany logic:
                // We want conversations where one of the participants is me.
                where: { userId: currentUser.id } 
            } as any]
        });
        
        // But we need the full participant list for the response usually
        // It's often easier to query again or include differently.
        // A simple way is to fetch all conversations that include the user, then fetch details.
        
        // Alternative approach:
        const participants = await ConversationParticipant.findAll({ where: { userId: currentUser.id } });
        const conversationIds = participants.map((p: any) => p.conversationId);
        
        const fullConversations = await Conversation.findAll({
            where: { id: conversationIds },
            // Note: You might need to define how you want to return participants.
            // The client expects `participantIds: string[]`.
        });
        
        const result = await Promise.all(fullConversations.map(async (convo: any) => {
            const parts = await ConversationParticipant.findAll({ where: { conversationId: convo.id } });
            return {
                ...convo.toJSON(),
                participantIds: parts.map((p: any) => p.userId)
            };
        }));

        res.status(200).json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching conversations.' });
    }
};

export const getAllChatMessages = async (req: any, res: any) => {
     const { user: currentUser } = req;
    try {
        // Get conversation IDs for user
        const participants = await ConversationParticipant.findAll({ where: { userId: currentUser.id } });
        const conversationIds = participants.map((p: any) => p.conversationId);

        const messages = await ChatMessage.findAll({
            where: {
                chatId: conversationIds
            }
        });
        res.status(200).json(messages);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching chat messages.' });
    }
}

export const sendMessage = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { chatId, content } = req.body;

    try {
        const isParticipant = await ConversationParticipant.findOne({
            where: { conversationId: chatId, userId: currentUser.id }
        });

        if (!isParticipant) {
            return res.status(403).json({ message: "Forbidden: Not a participant of this chat." });
        }

        const message = await ChatMessage.create({
            chatId,
            senderId: currentUser.id,
            text: content.text,
            media: content.media ? { ...content.media } : undefined,
        });
        
        res.status(201).json(message);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error sending message.' });
    }
};

export const findOrCreateConversation = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { targetUserId } = req.body;

    if (currentUser.id === targetUserId) {
        return res.status(400).json({ message: "Cannot create a conversation with yourself." });
    }

    try {
        // Find existing 1-on-1 conversation
        // Complex query in SQL/Sequelize for "Conversation with exactly these 2 participants"
        // Simplified: Find shared conversations, check count.
        
        const myConvos = await ConversationParticipant.findAll({ where: { userId: currentUser.id } });
        const myConvoIds = myConvos.map((c: any) => c.conversationId);
        
        const sharedConvos = await ConversationParticipant.findAll({
            where: {
                conversationId: myConvoIds,
                userId: targetUserId
            }
        });
        
        let existingConversation = null;
        
        for (const shared of sharedConvos) {
            const count = await ConversationParticipant.count({ where: { conversationId: shared.getDataValue('conversationId') } });
            if (count === 2) {
                existingConversation = await Conversation.findByPk(shared.getDataValue('conversationId'));
                break;
            }
        }

        if (existingConversation) {
            return res.status(200).json({
                ...existingConversation.toJSON(),
                participantIds: [currentUser.id, targetUserId]
            });
        }

        // Create new conversation
        const newConversation = await Conversation.create({});
        await ConversationParticipant.bulkCreate([
            { conversationId: newConversation.getDataValue('id'), userId: currentUser.id },
            { conversationId: newConversation.getDataValue('id'), userId: targetUserId }
        ]);
        
        res.status(201).json({
            ...newConversation.toJSON(),
            participantIds: [currentUser.id, targetUserId]
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error finding or creating conversation.' });
    }
};
