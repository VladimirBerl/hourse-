// Script to initialize database - creates all tables
import sequelize from './db';
import { seedDatabase } from './seed';

async function initDatabase() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        console.log('Creating database tables...');
        await sequelize.sync({ force: false, alter: true });
        console.log('Database tables created/updated successfully.');

        console.log('Seeding database...');
        await seedDatabase();
        console.log('Database seeded successfully.');

        console.log('Database initialization completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initDatabase();


