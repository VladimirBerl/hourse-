// Script to fix or delete a specific user
import { User } from './db';
import * as bcrypt from 'bcrypt';

async function fixUser() {
    try {
        const email = 'test1@gmail.com';
        
        console.log(`Looking for user with email: ${email}`);
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            console.log('User not found. You can register now.');
            process.exit(0);
        }
        
        console.log('User found. Checking password...');
        const testPassword = 'test1';
        const isValid = await bcrypt.compare(testPassword, (user as any).passwordHash);
        
        if (isValid) {
            console.log('Password is correct. User should be able to login.');
        } else {
            console.log('Password is incorrect. Deleting user so you can register again...');
            await user.destroy();
            console.log('User deleted. You can now register with test1@gmail.com and password test1');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixUser();






