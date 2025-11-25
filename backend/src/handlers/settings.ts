
import { AppSettings, NewLocationRequest, BonusTransaction, User } from '../db';
import { Request, Response } from 'express';

// --- Settings ---
export const getSettings = async (req: any, res: any) => {
    try {
        let settings = await AppSettings.findByPk('default');
        if (!settings) {
            // Create default if not exists
            settings = await AppSettings.create({ id: 'default', announcementBasePrice: 500 });
        }
        res.status(200).json(settings);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

export const updateSettings = async (req: any, res: any) => {
    const { user: currentUser } = req;
    if (currentUser.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });

    try {
        let settings = await AppSettings.findByPk('default');
        if (!settings) {
            settings = await AppSettings.create({ id: 'default', ...req.body });
        } else {
            await settings.update(req.body);
        }
        res.status(200).json(settings);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error updating settings' });
    }
};

// --- Locations ---
// Storing locations in AppSettings for simplicity as per mock structure, 
// or we could have a separate table. The mock uses a JSON object structure.
// We will assume `locations` is a JSON field in AppSettings or we handle it via a dedicated file/store.
// Given the schema, there isn't a 'Location' model. 
// Let's check if AppSettings has a locations field? No.
// *Solution*: Create a simple key-value store or extend AppSettings or just use a JSON file on disk/blob in DB.
// For this implementation, let's create a dynamic model or just add a `locations` JSON column to AppSettings in a real migration.
// Since I can't run migration now, let's pretend AppSettings has a `locations` field or store it in a generic way.
// Actually, looking at `db.ts`, `AppSettings` does NOT have `locations`.
// I will create a file-based fallback for locations or add it to the model definition dynamically here for runtime (Sequelize allows this if DB matches).
// Better: Use `fs` to store `locations.json` on server as a simple persistent store since it's config data.

import fs from 'fs';
import path from 'path';

const LOCATIONS_FILE = path.resolve('data', 'locations.json');
// Ensure data dir exists
if (!fs.existsSync(path.dirname(LOCATIONS_FILE))) {
    fs.mkdirSync(path.dirname(LOCATIONS_FILE));
}

export const getLocations = async (req: any, res: any) => {
    try {
        if (fs.existsSync(LOCATIONS_FILE)) {
            const data = fs.readFileSync(LOCATIONS_FILE, 'utf-8');
            res.status(200).json(JSON.parse(data));
        } else {
            // Default empty structure
            res.status(200).json({});
        }
    } catch (e) {
        res.status(500).json({ message: 'Error fetching locations' });
    }
};

export const updateLocations = async (req: any, res: any) => {
    const { user: currentUser } = req;
    if (currentUser.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    
    try {
        fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(req.body, null, 2));
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ message: 'Error saving locations' });
    }
};

// --- Welcome Page Content ---
const WELCOME_FILE = path.resolve('data', 'welcome.json');

export const getWelcomeContent = async (req: any, res: any) => {
    try {
        if (fs.existsSync(WELCOME_FILE)) {
            const data = fs.readFileSync(WELCOME_FILE, 'utf-8');
            res.status(200).json(JSON.parse(data));
        } else {
            res.status(200).json({}); // Client handles defaults
        }
    } catch (e) {
        res.status(500).json({ message: 'Error fetching welcome content' });
    }
};

export const updateWelcomeContent = async (req: any, res: any) => {
    const { user: currentUser } = req;
    if (currentUser.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });

    try {
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(req.body, null, 2));
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ message: 'Error saving welcome content' });
    }
};

// --- Bonuses ---
export const getAllBonusTransactions = async (req: any, res: any) => {
    try {
        const trans = await BonusTransaction.findAll();
        res.status(200).json(trans);
    } catch (e) {
        res.status(500).json({ message: 'Error fetching transactions' });
    }
};

export const adminUpdateBonuses = async (req: any, res: any) => {
    const { user: currentUser } = req;
    if (currentUser.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    
    const { targetUserId, amount, description } = req.body;

    try {
        const user = await User.findByPk(targetUserId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await user.increment('bonuses', { by: amount });

        const transactionData: any = {
            userId: targetUserId,
            amount,
            description: description || (amount > 0 ? 'Начисление сервиса' : 'Списание сервиса'),
            adminId: currentUser.id,
            source: 'admin_action',
            timestamp: new Date(),
        };

        if (amount > 0) {
            const settings = await AppSettings.findByPk('default');
            const expirationMonths = (settings as any)?.bonusExpirationMonths || 6;
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + expirationMonths);
            transactionData.expiresAt = expiresAt;
            transactionData.remainingAmount = amount;
        }

        await BonusTransaction.create(transactionData);
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ message: 'Error updating bonuses' });
    }
};

export const expireBonuses = async (req: any, res: any) => {
    try {
        const now = new Date();
        // Logic to find expired transactions with remaining amount > 0
        // This is complex in SQL/Sequelize without raw queries for comparison
        // We fetch potential candidates and process in JS for simplicity as per mock logic
        const transactions = await BonusTransaction.findAll({
            where: {
                // simplistic filter, refine in prod
            }
        });
        
        // Mock logic ported:
        // Filter in memory
        const transactionsToExpire = transactions.filter((t: any) => 
            t.amount > 0 && 
            t.expiresAt && 
            new Date(t.expiresAt) < now && 
            (t.remainingAmount === undefined || t.remainingAmount > 0)
        );

        for (const tx of transactionsToExpire) {
            const amountToExpire = (tx as any).remainingAmount ?? (tx as any).amount;
            if (amountToExpire <= 0) continue;

            const user = await User.findByPk((tx as any).userId);
            if (user) {
                const currentBonuses = (user as any).bonuses || 0;
                const newBonuses = Math.max(0, currentBonuses - amountToExpire);
                await user.update({ bonuses: newBonuses });

                await BonusTransaction.create({
                    userId: (user as any).id,
                    amount: -amountToExpire,
                    description: `Истечение срока действия бонусов от ${new Date((tx as any).timestamp).toLocaleDateString()}`,
                    timestamp: now,
                    source: 'system'
                });
            }
            await tx.update({ remainingAmount: 0 });
        }

        res.status(200).json({ success: true, expiredCount: transactionsToExpire.length });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error running expiration' });
    }
};
