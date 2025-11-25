
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../db';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      file?: any;
    }
  }
}

export const createJWT = (user: any) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in .env');
  }
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  return token;
};

export const transformUserForClient = (userInstance: any) => {
    if (!userInstance) return null;
    // Sequelize instance to plain object
    const userPlain = typeof userInstance.toJSON === 'function' ? userInstance.toJSON() : userInstance;
    const { passwordHash, salt, ...userSafe } = userPlain;
    
    return {
        ...userSafe,
        // Map associated objects to just IDs for client compatibility
        linkedUsers: userPlain.linkedUsers?.map((u: any) => u.id) || [],
        pendingStudents: userPlain.pendingStudents?.map((u: any) => u.id) || [],
        studentRequests: userPlain.studentRequests?.map((u: any) => u.id) || [],
        trainerRequests: userPlain.trainerRequests?.map((u: any) => u.id) || [],
    };
};

export const protect = async (req: any, res: any, next: NextFunction) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const [, token] = bearer.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token format' });
  }
  
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET not defined.');
    return res.status(500).json({ message: 'Internal server error' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    
    const userWithRelations = await User.findByPk(payload.id, {
      include: [
        { model: User, as: 'linkedUsers', attributes: ['id'] },
        { model: User, as: 'pendingStudents', attributes: ['id'] },
        { model: User, as: 'studentRequests', attributes: ['id'] },
        { model: User, as: 'trainerRequests', attributes: ['id'] },
      ]
    });

    if (!userWithRelations || (userWithRelations as any).isDeleted) {
      return res.status(401).json({ message: 'Unauthorized: User not found or has been deleted' });
    }

    req.user = transformUserForClient(userWithRelations);
    next();
  } catch (e) {
    console.error('Token verification error:', (e as Error).message);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
