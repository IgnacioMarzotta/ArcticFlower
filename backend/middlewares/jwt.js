const jwt = require('jsonwebtoken');

module.exports = function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];  

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {  
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });  
    }
    req.userId = decoded.userId || decoded.sub;  
    next();
  });
};