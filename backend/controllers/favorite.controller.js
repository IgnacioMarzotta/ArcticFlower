const Favorite = require('../models/Favorite');


// Añadir especie a favoritos
exports.addFavorite = async (req, res) => {
  try {
    const userId    = req.userId;
    const { speciesId, clusterId } = req.body;

    if (!speciesId || !clusterId) {
      return res.status(400).json({ message: 'speciesId y clusterId son requeridos' });
    }

    const exists = await Favorite.findOne({ userId, speciesId, clusterId });
    if (exists) {
      return res.status(409).json({ message: 'Ya existe este favorito' });
    }

    let fav = await Favorite.create({ userId, speciesId, clusterId });

    fav = await Favorite.findById(fav._id)
      .populate('speciesId')
      .populate('clusterId');

    res.status(201).json(fav);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear favorito', error: err.message });
  }
};

// Quitar especie de favoritos
exports.removeFavorite = async (req, res) => {
    try {
      const userId    = req.userId;
      const { speciesId, clusterId } = req.body;
  
      if (!speciesId || !clusterId) {
        return res.status(400).json({ message: 'speciesId y clusterId son requeridos' });
      }
  
      const deleted = await Favorite.findOneAndDelete({ userId, speciesId, clusterId });
      if (!deleted) {
        return res.status(404).json({ message: 'Favorito no encontrado' });
      }
      res.json({ message: 'Favorito eliminado' });
    } catch (err) {
      res.status(500).json({ message: 'Error al eliminar favorito', error: err.message });
    }
};

// Listar favoritos de un usuario
exports.getFavoritesByUser = async (req, res) => {
    try {
        const userId = req.userId;
        const favs = await Favorite.find({ userId })
        .populate('speciesId')
        .populate('clusterId');
        res.json(favs);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener favoritos', error: err.message });
    }
};