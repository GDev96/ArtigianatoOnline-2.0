const { describe, test, expect, beforeAll } = require('@jest/globals');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Mock auth functions for testing
const auth = {
    generateToken: (user) => {
        return jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    },
    verifyPassword: async (password, hashedPassword) => {
        return bcrypt.compare(password, hashedPassword);
    }
};

describe('Authentication Unit Tests', () => {
    beforeAll(() => {
        process.env.JWT_SECRET = 'test-secret';
        process.env.NODE_ENV = 'test';
    });

  describe('Password Verification', () => {
    test('should verify password correctly', async () => {
      const password = 'testpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const isValid = await auth.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should reject invalid password', async () => {
      const password = 'testpassword';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const isValid = await auth.verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  afterAll(done => {
    done();
  });
});