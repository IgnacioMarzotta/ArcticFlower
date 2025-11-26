const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null 
    },
    species: {
        type: Schema.Types.ObjectId,
        ref: 'Species',
        default: null
    },
    message: {
        type: String,
        required: true,
        length: 1024,
    },
    type: {
        type: String,
        enum: ['bug', 'data_error', 'feedback'],
        default: 'feedback' 
    },
    resolved: {
        type: Boolean,
        default: false 
    },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);