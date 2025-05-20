const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validar campos requeridos
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Usuario o email ya registrado' });
    }

    // Crear nuevo usuario
    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar JWT
    const token = jwt.sign(
      { userId: user._id, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, permissions: user.permissions });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};


exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username email createdAt');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({
      username: user.username,
      email: user.email,
      created_at: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};


exports.refresh = async (req, res) => {

  const token = req.cookies['refresh_token'];
  if (!token) return res.status(401).end();

  try {
    const payload = jwt.verify(token, process.env.REFRESH_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).end();

    const newAccess = jwt.sign(
      { userId: user._id, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const newRefresh = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: '14d' }
    );

    res.cookie('refresh_token', newRefresh, { httpOnly: true, secure: true }).json({ accessToken: newAccess });
  } catch (e) {
    return res.status(401).end();
  }
};