const mongoose = require('mongoose');

const clusterSchema = new mongoose.Schema({
    country: {
        type: String,
        required: true,
        unique: true
    },
    countryName: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        required: true,
        default: 0
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    worstCategory: {
        type: String,
        required: true,
        default: 'LC'
    }
}, { timestamps: true });

module.exports = mongoose.model('Cluster', clusterSchema);