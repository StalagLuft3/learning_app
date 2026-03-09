const jwt = require('jsonwebtoken');

// Create a test token with the email from our seed data
const testToken = jwt.sign(
  { email: 'tt@email.com' },
  '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b', // JWT secret from .env
  { expiresIn: '24h' }
);

console.log('Test Token:');
console.log(testToken);
console.log('\nTo test in browser console:');
console.log(`document.cookie = "x-auth-token=${testToken}; path=/";`);