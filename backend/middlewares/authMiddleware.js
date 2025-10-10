import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  console.log("check for authorize ...");
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = authHeader.split(' ')[1]; // Extract the token from "Bearer TOKEN"
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    console.log("success");
    next();
    
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export default authMiddleware;