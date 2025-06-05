const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const connectDB = require('../../config/db');

describe('User Model', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            try {
                await connectDB();
            } catch (err) {
                throw new Error(`MongoDB connection failed via connectDB for user.model.spec.js: ${err.message}`);
            }
        }
    });
    
    afterEach(async () => {
        try {
            await User.deleteMany({});
        } catch (err) {
            //console.error(`Error cleaning up User collection: ${err.message}`);
        }
    });
    
    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    });
    
    describe('Password Hashing', () => {
        it('should hash the password before saving a new user', async () => {
            const userData = {
                username: 'testuserHashedModel',
                email: 'testuserHashedModel@example.com',
                password: 'password123',
            };
            const user = new User(userData);
            await user.save();
            
            expect(user.password).toBeDefined();
            expect(user.password).not.toBe(userData.password);
            
            const isMatch = await bcrypt.compare(userData.password, user.password);
            expect(isMatch).toBe(true);
        });
        
        it('should hash the password when the password field is modified', async () => {
            const initialPassword = 'password123';
            const updatedPassword = 'newPassword456';
            
            const user = new User({
                username: 'testuserModify',
                email: 'testusermodify@example.com',
                password: initialPassword,
            });
            await user.save();
            const initialHashedPassword = user.password;
            
            user.password = updatedPassword;
            await user.save();
            
            expect(user.password).not.toBe(initialPassword);
            expect(user.password).not.toBe(updatedPassword);
            expect(user.password).not.toBe(initialHashedPassword); 
            
            const isMatchOld = await bcrypt.compare(initialPassword, user.password);
            expect(isMatchOld).toBe(false);
            
            const isMatchNew = await bcrypt.compare(updatedPassword, user.password);
            expect(isMatchNew).toBe(true);
        });
        
        it('should not re-hash the password if the password field is not modified', async () => {
            const user = new User({
                username: 'testuserNoModify',
                email: 'testusernomodify@example.com',
                password: 'password123',
            });
            await user.save();
            const initialHashedPassword = user.password;
            
            user.username = 'testuserNoModifyUpdated';
            await user.save();
            
            expect(user.password).toBe(initialHashedPassword); 
        });
    });
});