const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserMissionSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId,
        ref: 'User', 
        required: true 
    },
    missionId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Mission', 
        required: true 
    },
    params: { 
        type: Schema.Types.Mixed, 
        default: {} 
    },
    description: {
        type: String, 
        default: '' 
    },
    progress: {
        seen: {
            type: [String],
            default: []
        }
    },
    completed: { 
        type: Boolean, 
        default: false 
    },
    date: { 
        type: Date, 
        required: true, 
        index: true 
    },
}, { timestamps: true });

UserMissionSchema.index({ 
    userId: 1, 
    missionId: 1, 
    date: 1 
}, { unique: true });

module.exports = mongoose.model('UserMission', UserMissionSchema);