const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true,
    validate: {
      validator: v => /^[A-Z]{2}$/.test(v),
      message: 'Codigo de pais invalido (ISO 3166-1 alpha-2)'
    }
  },
  continent: {
    type: String,
    required: true,
    enum: ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica']
  },
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90,
    validate: {
      validator: v => typeof v === 'number' && !isNaN(v),
      message: 'Latitud debe ser un numero valido'
    }
  },
  lng: {
    type: Number,
    required: true,
    min: -180,
    max: 180,
    validate: {
      validator: v => typeof v === 'number' && !isNaN(v),
      message: 'Longitud debe ser un numero valido'
    }
  }
});

const descriptionSchema = new mongoose.Schema({
  rationale: String ,
  habitat: String ,
  threats: String ,
  population: String ,
  populationTrend: String ,
  range: String ,
  useTrade: String ,
  conservationActions: String,
}, { _id: false });

const mediaSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: 'unknown'
  },
  format: {
    type: String,
    required: true,
    default: 'unknown'
  },
  identifier: {
    type: String,
    required: true,
    validate: {
      validator: v => /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(v),
      message: 'URL inválida'
    }
  },
  title: String,
  description: String,
  creator: String,
  contributor: String,
  publisher: String,
  rightsHolder: String,
  license: String
}, { _id: false });

const speciesSchema = new mongoose.Schema({
  taxon_id: {
    type: String,
    required: true,
    unique: true,
    maxlength: 32 
  },
  common_name: {
    type: String,
    maxlength: 256
  },
  scientific_name: {
    type: String,
    required: true,
    maxlength: 256
  },
  category: {
    type: String,
    required: true,
    uppercase: true
  },
  description: {
    type: descriptionSchema,
    required: true,
    default: {},
  },
  kingdom: {
    type: String,
    required: true,
    maxlength: 64,
    default: 'Unknown'
  },
  phylum: {
    type: String,
    required: true,
    maxlength: 64,
    default: 'Unknown'
  },
  class: {
    type: String,
    required: true,
    maxlength: 64,
    default: 'Unknown'
  },
  order: {
    type: String,
    required: true,
    maxlength: 64,
    default: 'Unknown'
  },
  family: {
    type: String,
    required: true,
    maxlength: 64,
    default: 'Unknown'
  },
  genus: {
    type: String,
    required: true,
    maxlength: 64,
    default: 'Unknown'
  },
  locations: {
    type: [locationSchema],
    required: true,
    default: []
  },
  media: {
    type: [mediaSchema],
    default: []
  },
  gbifIds: {
    type: [String],
    default: []
  },
  references: {
    type: [String],
    default: []
  },
}, { timestamps: true });

module.exports = mongoose.model('Species', speciesSchema);