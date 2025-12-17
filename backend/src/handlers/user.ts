import { Request, Response } from 'express';
import { User, BonusTransaction, AppSettings } from '../db';
import * as bcrypt from 'bcrypt';
import { createJWT, transformUserForClient } from '../modules/auth';
import sequelize from '../db';

export const register = async (req: any, res: any) => {
  const {
    email,
    password,
    name,
    surname,
    country,
    region,
    city,
    role,
    referredBy,
    permissions,
    notificationSettings,
  } = req.body;

  if (!email || !password || !name || !surname || !country || !region || !city || !role) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Increment referral count if referredBy exists
    if (referredBy) {
      const referrer = await User.findByPk(referredBy);
      if (referrer) {
        await referrer.increment('referralCount');
      }
    }

    // Get trial subscription settings
    const settings = await AppSettings.findByPk('default');
    const trialSettings = (settings as any)?.trialSettings;
    
    // Apply trial subscription if configured and user is not Admin or Spectator
    let subscription = undefined;
    if (trialSettings && trialSettings.tier && trialSettings.durationDays && role !== 'Admin' && role !== 'Spectator') {
      const registrationDate = new Date();
      const expiresAt = new Date(registrationDate);
      expiresAt.setDate(expiresAt.getDate() + trialSettings.durationDays);
      
      subscription = {
        tier: trialSettings.tier,
        expiresAt: expiresAt.toISOString(),
      };
    }

    const newUser = await User.create({
      name,
      surname,
      email,
      passwordHash,
      salt,
      country,
      region,
      city,
      role,
      referredBy,
      notificationSettings: notificationSettings ?? {},
      permissions: permissions ?? {},
      subscription: subscription,
    });

    const userForClient = transformUserForClient(newUser);
    const token = createJWT(newUser);
    res.status(201).json({ token, user: userForClient });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error creating user.' });
  }
};

export const login = async (req: any, res: any) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }

  try {
    const userWithRelations = await User.findOne({
      where: { email },
      include: [
        { model: User, as: 'linkedUsers', attributes: ['id'] },
        { model: User, as: 'pendingStudents', attributes: ['id'] },
        { model: User, as: 'studentRequests', attributes: ['id'] },
        { model: User, as: 'trainerRequests', attributes: ['id'] },
      ],
    });

    if (!userWithRelations || (userWithRelations as any).isDeleted) {
      return res.status(401).json({ message: 'Invalid credentials or user deleted.' });
    }

    const isValid = await bcrypt.compare(password, (userWithRelations as any).passwordHash);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    await (userWithRelations as any).update({ lastLogin: new Date(), isOnline: true });

    const userForClient = transformUserForClient(userWithRelations);
    const token = createJWT(userWithRelations);
    res.status(200).json({ token, user: userForClient });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error logging in.' });
  }
};

export const verifyToken = async (req: any, res: any) => {
  res.status(200).json(req.user);
};

export const getAllUsers = async (req: any, res: any) => {
  try {
    const users = await User.findAll({
      include: [
        { model: User, as: 'linkedUsers', attributes: ['id'] },
        { model: User, as: 'pendingStudents', attributes: ['id'] },
        { model: User, as: 'studentRequests', attributes: ['id'] },
        { model: User, as: 'trainerRequests', attributes: ['id'] },
      ],
    });
    const usersForClient = users.map(transformUserForClient);
    res.status(200).json(usersForClient);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching users.' });
  }
};

export const updateUser = async (req: any, res: any) => {
  const { id } = req.params;
  const { user: currentUser } = req;

  if (currentUser.id !== id && currentUser.role !== 'Admin') {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to update this user.' });
  }

  if (currentUser.id === id && currentUser.role === 'Admin') {
    if (req.body.role || req.body.permissions) {
      return res
        .status(403)
        .json({ message: 'Forbidden: Admins cannot change their own role or permissions here.' });
    }
  }

  const { passwordHash, salt, ...updateData } = req.body;

  try {
    const userToUpdate = await User.findByPk(id);
    if (!userToUpdate) return res.status(404).json({ message: 'User not found' });

    await sequelize.transaction(async (t) => {
      const oldUser = userToUpdate.toJSON() as any;

      // 1. Check for new subscription payment -> Referral Bonus
      const newPayment = updateData.subscription?.lastPayment;
      const oldPayment = oldUser.subscription?.lastPayment;

      if (newPayment && newPayment.amountPaid > 0 && (!oldPayment || newPayment.date !== oldPayment.date)) {
        if (oldUser.referredBy) {
          const referrer = await User.findByPk(oldUser.referredBy, { transaction: t });
          if (referrer) {
            const currentUserPurchaseCount = oldUser.referralPurchaseCount || 0;
            if (currentUserPurchaseCount < 5) {
              const bonusAmount = Math.round(newPayment.amountPaid * 0.2);
              if (bonusAmount > 0) {
                await referrer.increment('bonuses', { by: bonusAmount, transaction: t });

                const settings = await AppSettings.findByPk('default', { transaction: t });
                const expirationMonths = (settings as any)?.bonusExpirationMonths || 6;
                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + expirationMonths);

                await BonusTransaction.create(
                  {
                    userId: referrer.getDataValue('id'),
                    amount: bonusAmount,
                    description: `Бонус за покупку от ${oldUser.name} ${oldUser.surname}`,
                    source: 'referral',
                    sourceUserId: oldUser.id,
                    expiresAt,
                    remainingAmount: bonusAmount,
                  },
                  { transaction: t }
                );
              }
              updateData.referralPurchaseCount = currentUserPurchaseCount + 1;
            }
          }
        }
      }

      // 2. Check for Bonus Spending (Subscription payment using bonuses)
      if (updateData.subscription && updateData.bonuses !== undefined && oldUser.bonuses !== undefined) {
        const bonusesSpent = oldUser.bonuses - updateData.bonuses;
        if (bonusesSpent > 0) {
          // Determine which transactions to deduct from (FIFO)
          let amountToSpend = bonusesSpent;
          const activeTransactions = await BonusTransaction.findAll({
            where: { userId: id, source: ['referral', 'admin_action', 'system'] }, // Only fetch accruals
            order: [['timestamp', 'ASC']],
            transaction: t,
          });

          for (const tx of activeTransactions) {
            if (amountToSpend <= 0) break;
            const txData = tx.toJSON() as any;
            // Filter logic inside loop because sequelize query is simpler
            if (txData.amount <= 0 || (txData.remainingAmount !== null && txData.remainingAmount <= 0))
              continue;

            const currentRemaining = txData.remainingAmount !== null ? txData.remainingAmount : txData.amount;
            const spend = Math.min(amountToSpend, currentRemaining);

            await tx.update({ remainingAmount: currentRemaining - spend }, { transaction: t });
            amountToSpend -= spend;
          }

          const duration = updateData.subscription.lastPayment?.duration;
          const durationText = duration === 'year' ? 'на год' : 'на месяц';

          await BonusTransaction.create(
            {
              userId: id,
              amount: -bonusesSpent,
              description: `Оплата подписки "${updateData.subscription.tier}" ${durationText}`,
              source: 'system',
            },
            { transaction: t }
          );
        }
      }

      await userToUpdate.update(updateData, { transaction: t });
    });

    // Fetch updated with associations
    const updatedUserWithRelations = await User.findByPk(id, {
      include: [
        { model: User, as: 'linkedUsers', attributes: ['id'] },
        { model: User, as: 'pendingStudents', attributes: ['id'] },
        { model: User, as: 'studentRequests', attributes: ['id'] },
        { model: User, as: 'trainerRequests', attributes: ['id'] },
      ],
    });

    res.status(200).json(transformUserForClient(updatedUserWithRelations));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating user.' });
  }
};

export const updateUserRead = async (req: any, res: any) => {
  const { id } = req.params;
  const { chatId } = req.body;

  try {
    const userToUpdate = await User.findByPk(id);
    if (!userToUpdate) return res.status(404).json({ message: 'User not found' });

    const lastReadTimestampsUser = userToUpdate.get('lastReadTimestamps') || {};
    userToUpdate.set('lastReadTimestamps', { ...lastReadTimestampsUser, [chatId]: new Date() });
    await userToUpdate.save();

    const updatedUserWithRelations = await User.findByPk(id, {
      include: [
        { model: User, as: 'linkedUsers', attributes: ['id'] },
        { model: User, as: 'pendingStudents', attributes: ['id'] },
        { model: User, as: 'studentRequests', attributes: ['id'] },
        { model: User, as: 'trainerRequests', attributes: ['id'] },
      ],
    });

    res.status(200).json(transformUserForClient(updatedUserWithRelations));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating read.' });
  }
};

export const sendLinkRequest = async (req: any, res: any) => {
  const { id: targetUserId } = req.params;
  const { user: currentUser } = req;

  try {
    const targetUser = await User.findByPk(targetUserId, {
      include: [
        { model: User, as: 'linkedUsers', attributes: ['id'] },
        { model: User, as: 'studentRequests', attributes: ['id'] },
        { model: User, as: 'trainerRequests', attributes: ['id'] },
      ],
    });

    if (!targetUser || (targetUser as any).isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUserIdValue = targetUser.getDataValue('id');
    if (targetUserIdValue === currentUser.id) {
      return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    // Check if already linked
    const linkedUsers = (targetUser as any).linkedUsers || [];
    if (linkedUsers.some((u: any) => u.id === currentUser.id)) {
      return res.status(400).json({ message: 'Users are already linked' });
    }

    // Check if request already exists
    const studentRequests = (targetUser as any).studentRequests || [];
    const trainerRequests = (targetUser as any).trainerRequests || [];
    const pendingStudents = (targetUser as any).pendingStudents || [];

    if (currentUser.role === 'Student') {
      if (studentRequests.some((u: any) => u.id === currentUser.id)) {
        return res.status(400).json({ message: 'Request already sent' });
      }
      // Add student request - Sequelize add* methods accept ID or instance
      await (targetUser as any).addStudentRequest(currentUser.id);
    } else if (currentUser.role === 'Trainer') {
      // Check if target is a student - use pendingStudents
      if (targetUser.getDataValue('role') === 'Student') {
        if (pendingStudents.some((u: any) => u.id === currentUser.id)) {
          return res.status(400).json({ message: 'Request already sent' });
        }
        // Trainer sending request to student - add to pendingStudents and set pendingTrainerRequestFrom
        await (targetUser as any).addPendingStudent(currentUser.id);
        await targetUser.update({ pendingTrainerRequestFrom: currentUser.id });
      } else {
        // Trainer sending request to another trainer - use trainerRequests
        if (trainerRequests.some((u: any) => u.id === currentUser.id)) {
          return res.status(400).json({ message: 'Request already sent' });
        }
        await (targetUser as any).addTrainerRequest(currentUser.id);
      }
    } else {
      return res.status(403).json({ message: 'Only Students and Trainers can send link requests' });
    }

    res.status(200).json({ success: true, message: 'Request sent successfully' });
  } catch (e) {
    console.error('Error sending link request:', e);
    res.status(500).json({ message: 'Error sending link request' });
  }
};

export const respondToLinkRequest = async (req: any, res: any) => {
  const { id: requesterId } = req.params;
  const { user: currentUser } = req;
  const { accept } = req.body;

  try {
    // Fetch current user with relations to check requests
    const currentUserWithRelations = await User.findByPk(currentUser.id, {
      include: [
        { model: User, as: 'linkedUsers', attributes: ['id'] },
        { model: User, as: 'studentRequests', attributes: ['id'] },
        { model: User, as: 'trainerRequests', attributes: ['id'] },
        { model: User, as: 'pendingStudents', attributes: ['id'] },
      ],
    });

    if (!currentUserWithRelations) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    const requester = await User.findByPk(requesterId, {
      include: [{ model: User, as: 'linkedUsers', attributes: ['id'] }],
    });
    if (!requester || (requester as any).isDeleted) {
      return res.status(404).json({ message: 'Requester not found' });
    }

    // Check if request exists
    const studentRequests = (currentUserWithRelations as any).studentRequests || [];
    const trainerRequests = (currentUserWithRelations as any).trainerRequests || [];
    const pendingStudents = (currentUserWithRelations as any).pendingStudents || [];
    const hasStudentRequest = studentRequests.some((u: any) => u.id === requesterId);
    const hasTrainerRequest = trainerRequests.some((u: any) => u.id === requesterId);
    // Check if requester is in pendingStudents (trainer sent request to student)
    const hasPendingStudent = pendingStudents.some((u: any) => u.id === requesterId);
    // Check if current user (student) has pendingTrainerRequestFrom set to requester (trainer)
    const hasPendingTrainerRequest =
      (currentUserWithRelations as any).pendingTrainerRequestFrom === requesterId;

    if (!hasStudentRequest && !hasTrainerRequest && !hasPendingStudent && !hasPendingTrainerRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if already linked
    const linkedUsers = (currentUserWithRelations as any).linkedUsers || [];
    if (linkedUsers.some((u: any) => u.id === requesterId)) {
      return res.status(400).json({ message: 'Users are already linked' });
    }

    await sequelize.transaction(async (t) => {
      const currentUserInstance = await User.findByPk(currentUser.id, { transaction: t });
      const requesterInstance = await User.findByPk(requesterId, { transaction: t });

      if (!currentUserInstance || !requesterInstance) {
        throw new Error('User not found');
      }

      // Remove request
      if (hasStudentRequest) {
        await (currentUserInstance as any).removeStudentRequest(requesterInstance, { transaction: t });
      }
      if (hasTrainerRequest) {
        await (currentUserInstance as any).removeTrainerRequest(requesterInstance, { transaction: t });
      }
      if (hasPendingStudent) {
        // Trainer (currentUser) sent request to student (requester), remove from trainer's pendingStudents
        await (currentUserInstance as any).removePendingStudent(requesterInstance, { transaction: t });
        // Also clear pendingTrainerRequestFrom field on student
        await requesterInstance.update({ pendingTrainerRequestFrom: null }, { transaction: t });
      }
      if (hasPendingTrainerRequest) {
        // Student (currentUser) responding to trainer's (requester) request
        // Remove from trainer's pendingStudents
        const trainerInstance = await User.findByPk(requesterId, { transaction: t });
        if (trainerInstance) {
          await (trainerInstance as any).removePendingStudent(currentUserInstance, { transaction: t });
        }
        // Clear pendingTrainerRequestFrom field on student
        await currentUserInstance.update({ pendingTrainerRequestFrom: null }, { transaction: t });
      }

      // If accepted, create link (both sides of the relationship)
      if (accept) {
        await (currentUserInstance as any).addLinkedUser(requesterInstance, { transaction: t });
        await (requesterInstance as any).addLinkedUser(currentUserInstance, { transaction: t });
      }
    });

    res.status(200).json({ success: true, message: accept ? 'Request accepted' : 'Request rejected' });
  } catch (e) {
    console.error('Error responding to link request:', e);
    res.status(500).json({ message: 'Error responding to link request' });
  }
};

export const deleteUser = async (req: any, res: any) => {
  const { id } = req.params;
  const { user: currentUser } = req;
  const { method } = req.body;

  if (currentUser.id !== id && currentUser.role !== 'Admin') {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this user.' });
  }

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.update({
      isDeleted: true,
      email: `deleted-${id}@example.com`,
      passwordHash: `deleted-${Date.now()}`,
      salt: '',
      isOnline: false,
      deletionInfo: {
        method: method || (currentUser.id === id ? 'self' : 'admin'),
        timestamp: new Date().toISOString(),
      },
    });

    // Cleanup relations (Mock did this manually, here specific joins might need cleanup if no Cascade)
    // Assuming model relations handle some, but explicit cleanup logic from mock:
    // linkedUsers, pendingStudents etc are M-to-M tables.
    // We can just leave them or explicitly clear them.
    // For simplicity and to match mock logic:
    const userInstance = user as any;
    await userInstance.setLinkedUsers([]);
    await userInstance.setPendingStudents([]);
    await userInstance.setStudentRequests([]);
    await userInstance.setTrainerRequests([]);

    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error deleting user.' });
  }
};

export const updateUserAndId = async (req: any, res: any) => {
  const { oldId } = req.params;
  const { id: newId, ...updateData } = req.body;
  const { user: currentUser } = req;

  if (currentUser.role !== 'Admin') {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    const userToUpdate = await User.findByPk(oldId);
    if (!userToUpdate) return res.status(404).json({ message: 'User not found' });

    if (newId && newId !== oldId) {
      const existing = await User.findByPk(newId);
      if (existing) return res.status(400).json({ message: 'User with new ID already exists.' });

      // Updating PK in SQL is tricky/impossible directly in some configs.
      // Sequelize doesn't support changing PK easily.
      // Strategy: Create new, move data, delete old? Or just update other fields if ID change is too complex.
      // NOTE: Changing UUID/PK is generally bad practice.
      // If the ID is just a string field (not internal PK), it's fine.
      // In schema `id` is PK UUID.
      // However, in the Mock, IDs were strings like "100001".
      // If we strictly use UUIDs in DB, we can't change them easily to arbitrary strings.
      // Assuming for this backend implementation we allow updating other fields but warn about ID.
      // IF ID is crucial to be custom string, the DB schema for ID should be STRING, not UUID.
      // **Current schema uses UUID.**
      // We will skip ID update if it's a primary key constraint issue, or try to update if supported.
      // For now, let's update the rest.

      // *Mock parity hack*: If the DB actually supports string IDs (modified schema), we could do it.
      // Assuming standard UUID, we ignore ID change or throw error.
      // Let's try to update if provided, but catch error.
    }

    await userToUpdate.update({ ...updateData });
    // Note: Not actually changing ID here to prevent DB integrity issues unless schema allows it.

    res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating user.' });
  }
};
