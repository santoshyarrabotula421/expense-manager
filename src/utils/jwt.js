const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const generateAuthTokens = (user, role) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: role,
    company_name: user.company_name
  };

  const accessToken = generateToken(payload);
  
  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  };
};

module.exports = {
  generateToken,
  verifyToken,
  generateAuthTokens
};