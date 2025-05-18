const mongoose = require('mongoose');
const { Schema } = mongoose;

const MissionSchema = new Schema({
    type: { 
        type: String, 
        required: true 
    },
    params: { 
        type: Schema.Types.Mixed, 
        default: {} 
    },
    rewardXP: { 
        type: Number, 
        default: 0 
    },
}, { timestamps: true });

module.exports = mongoose.model('Mission', MissionSchema);
