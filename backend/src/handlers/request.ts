
import { Request, Response } from 'express';
import { PasswordResetRequest, NewLocationRequest, User } from '../db';
import * as bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

export const getAllPasswordResetRequests = async (req: any, res: any) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const requests = await PasswordResetRequest.findAll();
        res.status(200).json(requests);
    } catch (e) {
        res.status(500).json({ message: 'Error fetching requests' });
    }
};

export const submitPasswordResetRequest = async (req: any, res: any) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (user) {
            const existing = await PasswordResetRequest.findOne({ where: { userId: user.getDataValue('id'), status: 'pending' } });
            if (!existing) {
                await PasswordResetRequest.create({
                    userId: user.getDataValue('id'),
                    status: 'pending',
                    requestTimestamp: new Date()
                });
            }
        }
        // Always return success to prevent email enumeration
        res.status(200).json({ success: true, message: 'If account exists, request sent.' });
    } catch (e) {
        res.status(500).json({ message: 'Error' });
    }
};

export const resolvePasswordResetRequest = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { requestId, newPassword } = req.body;
    if (currentUser.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });

    try {
        const request = await PasswordResetRequest.findByPk(requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        const user = await User.findByPk(request.getDataValue('userId'));
        if (user) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPassword, salt);
            await user.update({ passwordHash, salt });
        }

        await request.update({
            status: 'completed',
            resolvedBy: currentUser.id,
            resolvedTimestamp: new Date()
        });

        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ message: 'Error resolving request' });
    }
};

export const deletePasswordResetRequest = async (req: any, res: any) => {
    const { id } = req.params;
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        await PasswordResetRequest.destroy({ where: { id } });
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ message: 'Error deleting request' });
    }
};

// --- Locations ---

export const getAllNewLocationRequests = async (req: any, res: any) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const requests = await NewLocationRequest.findAll();
        res.status(200).json(requests);
    } catch (e) {
        res.status(500).json({ message: 'Error' });
    }
};

export const resolveNewLocationRequest = async (req: any, res: any) => {
    const { user: currentUser } = req;
    const { requestId, isApproved, correctedLocation } = req.body;
    if (currentUser.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });

    try {
        const request = await NewLocationRequest.findByPk(requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        const status = isApproved ? 'approved' : 'rejected';
        await request.update({
            status,
            resolvedBy: currentUser.id,
            resolvedTimestamp: new Date()
        });

        if (isApproved) {
            const loc = correctedLocation || {
                city: request.getDataValue('submittedCity'),
                region: request.getDataValue('submittedRegion'),
                country: request.getDataValue('submittedCountry')
            };

            // Update user profile
            const user = await User.findByPk(request.getDataValue('userId'));
            if (user) {
                await user.update({ ...loc });
            }

            // Update Locations JSON file
            const LOCATIONS_FILE = path.resolve('data', 'locations.json');
            if (fs.existsSync(LOCATIONS_FILE)) {
                const locations = JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf-8'));
                const { country, region, city } = loc;
                
                if (!locations[country]) locations[country] = {};
                if (!locations[country][region]) locations[country][region] = [];
                if (!locations[country][region].includes(city)) {
                    locations[country][region].push(city);
                    fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(locations, null, 2));
                }
            }
        }

        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error resolving location request' });
    }
};
