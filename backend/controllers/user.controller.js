const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');


//Definicion del Google Client con las variables de entorno proporcionadas por Google.
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.NODE_ENV === 'production' ? process.env.GOOGLE_REDIRECT_URI_PROD : process.env.GOOGLE_REDIRECT_URI_DEV
});


//Funcion para crear un usuario desde el formulario de registro
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already registered' });
    }
    
    const newUser = new User({ username, email, password });
    await newUser.save();
    
    res.status(201).json({ message: 'User successfully created' });
  } catch (error) {
    console.error("[user.controller] Register error:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


//Funcion encargada del login, devuelve los datos del usuario junto a un auth_token
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials, please try again.' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials, please try again.' });
    }
    
    const accessToken = jwt.sign(
      { userId: user._id, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        permissions: user.permissions
      }
    });
    
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


//Funcion encargada de obtener los datos del usuario para generar su perfil
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username email createdAt permissions xp level');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      username: user.username,
      email: user.email,
      created_at: user.createdAt,
      permissions: user.permissions,
      xp: user.xp,
      level: user.level
    });
  } catch (error) {
    console.error("GetProfile error:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


//Funcion encargada de refrescar el token de autenticacion segun el refresh_token
exports.refresh = async (req, res) => {
  const oldRefreshToken = req.cookies['refresh_token'];
  if (!oldRefreshToken) {
    return res.status(401).json({ message: 'No refresh token provided', code: 'NO_REFRESH_TOKEN' });
  }
  
  try {
    const payload = jwt.verify(oldRefreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(payload.userId);
    
    if (!user) {
      res.clearCookie('refresh_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      return res.status(403).json({ message: 'User not found for refresh token', code: 'USER_NOT_FOUND' });
    }
    
    const newAccessToken = jwt.sign(
      { userId: user._id, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({ accessToken: newAccessToken });
    
  } catch (e) {
    console.error("Refresh token error:", e.message);
    res.clearCookie('refresh_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return res.status(403).json({ message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' });
  }
};


//Funcion encargada de cerrar la sesion del usuario
exports.logout = (req, res) => {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.status(200).json({ message: 'Successfully logged out' });
};


//Funcion encargada de obtener los usuarios paginados para el panel de administracion
exports.getAllUsersForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    const { permissions, search } = req.query;
    
    const query = {};
    
    if (permissions === '0' || permissions === '1') {
      query.permissions = parseInt(permissions, 10);
    }
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { username: searchRegex },
        { email: searchRegex }
      ];
    }
    
    const usersPromise = User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const countPromise = User.countDocuments(query);
    
    const [users, totalUsers] = await Promise.all([usersPromise, countPromise]);
    const totalPages = Math.ceil(totalUsers / limit);
    
    res.json({
      users,
      totalPages,
      currentPage: page,
    });
    
  } catch (error) {
    console.error("[user.controller - getAllUsersForAdmin] Error:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


//Funcion encargada de modificar los permisos de un usuario por un administrador desde el panel de administracion
exports.updateUserPermissions = async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const { permissions } = req.body;
    const requestingAdminId = req.userId;
    
    if (targetUserId === requestingAdminId) {
      return res.status(403).json({ message: 'No puedes modificar tus propios permisos.' });
    }
    
    if (permissions === undefined || (permissions !== 0 && permissions !== 1)) {
      return res.status(400).json({ message: 'El nivel de permisos debe ser 0 o 1.' });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      { permissions },
      { new: true }
    ).select('-password'); // Nunca devolver el hash de la contraseña
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    
    res.json(updatedUser);
    
  } catch (error) {
    console.error("[user.controller - updateUserPermissions] Error:", error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};


//Funcion para eliminar usuarios desde el panel de administracion
exports.deleteUser = async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const requestingAdminId = req.userId;
    
    if (targetUserId === requestingAdminId) {
      return res.status(403).json({ message: 'No puedes eliminar tu propia cuenta desde el panel de administración.' });
    }
    
    const userToDelete = await User.findById(targetUserId);
    
    if (!userToDelete) {
      return res.status(404).json({ message: 'Usuario a eliminar no encontrado.' });
    }
    
    if (userToDelete.permissions === 1) {
      return res.status(403).json({ message: 'No se puede eliminar a otro administrador. Debes quitarle los permisos primero.' });
    }
    
    await User.findByIdAndDelete(targetUserId);
    
    res.status(200).json({ message: `Usuario ${userToDelete.username} eliminado exitosamente.` });
    
  } catch (error) {
    console.error("[user.controller - deleteUser] Error:", error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};


//Funcion encargada de generar los parametros para el popup de inicio de sesion de Google Omniauth
exports.startGoogleAuth = async (req, res) => {
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'email',
      'profile',
      'openid'
    ]
  });

  res.redirect(url);
};


//Funcion encargada de recibir la respuesta desde Google. Si el usuario existe, inicia sesion (y si es de una cuenta existente, asocia el google_id con la cuenta), y si no existe, crea el usuario con el email y username de Google. Luego crea el token de jwt, inicia sesion y redirige a home.
exports.googleCallback = async (req, res) => {

  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("Missing authorization code");
    }

    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: googleClient,
      version: 'v2'
    });

    const { data: googleUser } = await oauth2.userinfo.get();

    const user = await User.findOneAndUpdate(
      { email: googleUser.email },
      {
        email: googleUser.email,
        username: googleUser.name.replace(/\s+/g, ''),
        google_id: googleUser.id
      },
      { upsert: true, new: true }
    );

    const accessToken = jwt.sign(
      { userId: user._id, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    const frontendUrl = process.env.NODE_ENV === 'production' ? process.env.OAUTH_FRONTEND_URI_PROD : process.env.OAUTH_FRONTEND_URI_DEV

    return res.send(`
      <script>
        window.opener.postMessage(
          { accessToken: "${accessToken}" },
          "${frontendUrl}"
        );
        window.close();
      </script>
    `);

  } catch (err) {
    console.error('Google Callback Error', err);
    return res.status(500).send("Google authentication failed");
  }
};


//Funcion encargada de validar la unicidad del nombre de usuario
exports.checkUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    res.json({ isTaken: !!user });
  } catch (error) {
    console.error("[user.controller] CheckUsername error:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


//Funcion encargada de validar la unicidad del correo electronico
exports.checkEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    res.json({ isTaken: !!user });
  } catch (error) {
    console.error("[user.controller] CheckEmail error:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};