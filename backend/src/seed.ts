import { User } from './db';
import * as bcrypt from 'bcrypt';

export const seedDatabase = async () => {
    try {

        // 1. Main Admin
        const mainAdminEmail = 'start@maneg.pro';
        const mainAdminExists = await User.findOne({ where: { email: mainAdminEmail } });

        if (!mainAdminExists) {
            console.log('Creating default Main Admin...');

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('1', salt);

            await User.create({
                email: mainAdminEmail,
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
        const backupAdminEmail = 'a1@gmail.com';
        const backupAdminExists = await User.findOne({ where: { email: backupAdminEmail } });

        if (!backupAdminExists) {
            console.log('Creating default Backup Admin...');

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('BackupAdminPass2024!', salt);

            await User.create({
                email: backupAdminEmail,
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

