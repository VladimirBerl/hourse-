
import { User } from './db';
import * as bcrypt from 'bcrypt';

export const seedDatabase = async () => {
    try {
        // 1. Main Admin
        const mainAdminId = '000001';
        const mainAdminExists = await User.findByPk(mainAdminId);

        if (!mainAdminExists) {
            console.log('Creating default Main Admin...');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('1', salt); // Default password from mock

            await User.create({
                id: mainAdminId,
                email: 'start@maneg.pro',
                passwordHash,
                salt,
                name: 'Admin',
                surname: 'One',
                country: 'N/A',
                region: 'N/A',
                city: 'Control Panel',
                role: 'Admin',
                isOnline: false,
                permissions: {
                    canManageUsers: true,
                    canManageAnnouncements: true,
                    canManageNews: true,
                    canManageLibraryPosts: true,
                    canViewStats: true,
                    canViewMessages: true,
                    canManageAdmins: true,
                    canAccessChat: true,
                    canResetUserPasswords: true,
                    canManageSubscriptions: true
                },
                notificationSettings: {
                    chatMessage: 'push',
                    adminMessage: 'push',
                    announcementModeration: 'push',
                    passwordResetRequest: 'push',
                    newLocationRequest: 'push'
                }
            });
            console.log('Main Admin created.');
        }

        // 2. Backup Admin
        const backupAdminId = '000003';
        const backupAdminExists = await User.findByPk(backupAdminId);

        if (!backupAdminExists) {
            console.log('Creating default Backup Admin...');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('BackupAdminPass2024!', salt); // Default password from mock

            await User.create({
                id: backupAdminId,
                email: 'a1@gmail.com',
                passwordHash,
                salt,
                name: 'Backup',
                surname: 'Admin',
                country: 'N/A',
                region: 'N/A',
                city: 'Control Panel',
                role: 'Admin',
                isOnline: false,
                permissions: {
                    canManageUsers: true,
                    canManageAnnouncements: true,
                    canManageNews: true,
                    canManageLibraryPosts: true,
                    canViewStats: true,
                    canViewMessages: true,
                    canManageAdmins: true,
                    canAccessChat: true,
                    canResetUserPasswords: true,
                    canManageSubscriptions: true
                },
                notificationSettings: {
                    chatMessage: 'push',
                    adminMessage: 'push',
                    announcementModeration: 'push',
                    passwordResetRequest: 'push',
                    newLocationRequest: 'push'
                }
            });
            console.log('Backup Admin created.');
        }

    } catch (error) {
        console.error('Error seeding database:', error);
    }
};
