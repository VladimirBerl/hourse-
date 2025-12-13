import { Request, Response } from 'express';
import { Conversation, ConversationParticipant, ChatMessage } from '../db';
import { Op } from 'sequelize';

export const getConversations = async (req: any, res: any) => {
  const { user: currentUser } = req;
  try {
    // Find all conversations where user is a participant
    const participants = await ConversationParticipant.findAll({
      where: { userId: currentUser.id },
    });

    // If user has no conversations, return empty array
    if (participants.length === 0) {
      return res.status(200).json([]);
    }

    const conversationIds = participants.map((p: any) => p.conversationId);

    // Fetch conversations using Op.in for proper SQL query
    const fullConversations = await Conversation.findAll({
      where: {
        id: {
          [Op.in]: conversationIds,
        },
      },
    });

    // Get all participants for each conversation
    const result = await Promise.all(
      fullConversations.map(async (convo: any) => {
        const parts = await ConversationParticipant.findAll({
          where: { conversationId: convo.id },
        });
        return {
          ...convo.toJSON(),
          participantIds: parts.map((p: any) => p.userId),
        };
      })
    );

    res.status(200).json(result);
  } catch (e) {
    console.error('Error fetching conversations:', e);
    res.status(500).json({ message: 'Error fetching conversations.' });
  }
};

export const getAllChatMessages = async (req: any, res: any) => {
  const { user: currentUser } = req;
  try {
    // Get conversation IDs for user
    const participants = await ConversationParticipant.findAll({
      where: { userId: currentUser.id },
    });

    // If user has no conversations, return empty array
    if (participants.length === 0) {
      return res.status(200).json([]);
    }

    const conversationIds = participants.map((p: any) => p.conversationId);

    const messages = await ChatMessage.findAll({
      where: {
        chatId: {
          [Op.in]: conversationIds,
        },
      },
    });
    res.status(200).json(messages);
  } catch (e) {
    console.error('Error fetching chat messages:', e);
    res.status(500).json({ message: 'Error fetching chat messages.' });
  }
};

export const sendMessage = async (req: any, res: any) => {
  const { user: currentUser } = req;
  const { chatId, content } = req.body;

  try {
    const isParticipant = await ConversationParticipant.findOne({
      where: { conversationId: chatId, userId: currentUser.id },
    });

    if (!isParticipant) {
      return res.status(403).json({ message: 'Forbidden: Not a participant of this chat.' });
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

export const markMessagesAsRead = async (req: any, res: any) => {
  const { user: currentUser } = req;
  const { chatId } = req.body;

  try {
    if (!chatId) {
      return res.status(400).json({ message: 'chatId is required.' });
    }

    const isParticipant = await ConversationParticipant.findOne({
      where: { conversationId: chatId, userId: currentUser.id },
    });

    if (!isParticipant) {
      return res.status(403).json({ message: 'Forbidden: Not a participant of this chat.' });
    }

    // Find all unread messages in this chat that were not sent by the current user
    const unreadMessages = await ChatMessage.findAll({
      where: {
        chatId: chatId,
        status: { [Op.ne]: 'read' },
        senderId: { [Op.ne]: currentUser.id },
      },
    });

    // Mark all unread messages as read
    if (unreadMessages.length > 0) {
      await ChatMessage.update(
        { status: 'read' },
        {
          where: {
            chatId: chatId,
            status: { [Op.ne]: 'read' },
            senderId: { [Op.ne]: currentUser.id },
          },
        }
      );
    }

    res.status(200).json({ status: 'success', updatedCount: unreadMessages.length });
  } catch (e) {
    console.error('Error marking messages as read:', e);
    res.status(500).json({ message: 'Error marking messages as read.' });
  }
};

export const findOrCreateConversation = async (req: any, res: any) => {
  const { user: currentUser } = req;
  const { targetUserId } = req.body;

  if (currentUser.id === targetUserId) {
    return res.status(400).json({ message: 'Cannot create a conversation with yourself.' });
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
        userId: targetUserId,
      },
    });

    let existingConversation = null;

    for (const shared of sharedConvos) {
      const count = await ConversationParticipant.count({
        where: { conversationId: shared.getDataValue('conversationId') },
      });
      if (count === 2) {
        existingConversation = await Conversation.findByPk(shared.getDataValue('conversationId'));
        break;
      }
    }

    if (existingConversation) {
      return res.status(200).json({
        ...existingConversation.toJSON(),
        participantIds: [currentUser.id, targetUserId],
      });
    }

    // Create new conversation
    const newConversation = await Conversation.create({});
    await ConversationParticipant.bulkCreate([
      { conversationId: newConversation.getDataValue('id'), userId: currentUser.id },
      { conversationId: newConversation.getDataValue('id'), userId: targetUserId },
    ]);

    res.status(201).json({
      ...newConversation.toJSON(),
      participantIds: [currentUser.id, targetUserId],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error finding or creating conversation.' });
  }
};
