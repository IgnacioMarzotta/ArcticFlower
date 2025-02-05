const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true,
    maxlength: 128
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  }
});

const speciesSchema = new mongoose.Schema({
  taxon_id: {
     type: String,
      required: true,
      unique: true,
      maxlength: 32 
    },
  common_name: {
     type: String,
      required: true,
      maxlength: 128
    },
  scientific_name: {
     type: String,
      required: true,
      maxlength: 128 
    },
  category: {
    type: String,
    required: true,
    uppercase: true
  },
  kingdom: {
    type: String,
    required: true,
    enum: ['Animalia', 'Plantae', 'Fungi', 'Protista', 'Archaea', 'Bacteria'],
    maxlength: 32
  },
  // Ahora usamos un arreglo de ubicaciones en lugar de un string country
  locations: {
    type: [locationSchema],
    required: true,
    default: []
  },
  threats: { type: String, maxlength: 512 },
  media: {
    type: String,
    maxlength: 512,
    match: /^(http|https):\/\/[^ "]+$/
  }
}, { timestamps: true });

module.exports = mongoose.model('Species', speciesSchema);