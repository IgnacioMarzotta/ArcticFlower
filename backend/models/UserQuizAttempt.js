const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
    question_id: { type: String, required: true },
    selected_option_index: { type: Number, required: true },
    is_correct: { type: Boolean, required: true }
}, { _id: false });

const UserQuizAttemptSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    quiz_identifier: {
        type: String,
        required: true,
    },

    quiz_version_at_attempt: {
        type: Number,
        required: true
    },
    attempt_number: {
        type: Number,
        enum: [1, 2],
        required: true
    },
    answers: [AnswerSchema],
    score: {
        type: Number,
        required: true
    },
    total_questions_at_attempt: {
        type: Number,
        required: true,
    }
}, { timestamps: true });

UserQuizAttemptSchema.index({ user: 1, quiz_identifier: 1, attempt_number: 1 }, { unique: true });

module.exports = mongoose.model('UserQuizAttempt', UserQuizAttemptSchema);