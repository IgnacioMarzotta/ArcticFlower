const mongoose = require('mongoose');

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
    enum: ['DD', 'LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'LR/lc', 'LR/nt', 'LR/cd'],
    uppercase: true
  },
  kingdom: {
    type: String,
    required: true,
    enum: ['Animalia', 'Plantae', 'Fungi', 'Protista', 'Archaea', 'Bacteria'],
    maxlength: 32
  },
  country: {
    type: String,
    required: true,
    maxlength: 512
  },
  threats: {
    type: String,
    maxlength: 512
  },
  media: {
    type: String,
    maxlength: 512,
    match: /^(http|https):\/\/[^ "]+$/
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Species', speciesSchema);