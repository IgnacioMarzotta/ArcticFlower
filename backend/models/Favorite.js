const mongoose = require('mongoose');
const { Schema } = mongoose;

const FavoriteSchema = new Schema({
    userId:    {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
    speciesId: {
        type: Schema.Types.ObjectId, 
        ref: 'Species', 
        required: true 
    },
    clusterId:{ 
        type: Schema.Types.ObjectId,
        ref: 'Cluster', 
        required: true 
    },
    dateAdded: {
        type: Date, 
        default: Date.now 
    }
});

FavoriteSchema.index({ 
    userId: 1,
    speciesId: 1, 
    clusterId: 1 
}, { unique: true });

module.exports = mongoose.model('Favorite', FavoriteSchema);