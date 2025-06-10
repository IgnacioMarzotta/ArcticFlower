const UserQuizAttempt = require('../models/UserQuizAttempt');
const quizFileService = require('../services/quizFile.service.js');


async function getCurrentQuizData() {
    const quizData = await quizFileService.getQuizData('questions.json');
    if (!quizData || !quizData.questions || !quizData.quiz_identifier || quizData.version === undefined) {
        console.error("Formato de questions.json inválido:", quizData);
        throw { status: 500, message: 'Formato de questions.json inválido o información esencial faltante.' };
    }
    return quizData;
}


exports.getActiveQuizForUser = async (req, res, next) => {
    try {
        const currentQuiz = await getCurrentQuizData();
        const questionsForClient = currentQuiz.questions; 
        
        res.json({
            quiz_identifier: currentQuiz.quiz_identifier,
            description: currentQuiz.description,
            version: currentQuiz.version,
            questions: questionsForClient
        });
    } catch (error) {
        next(error);
    }
};


exports.getUserQuizStatus = async (req, res, next) => {
    const userId = req.userId;
    
    try {
        const currentQuiz = await getCurrentQuizData();
        const { quiz_identifier, version: currentVersion, minTimeBetweenAttemptsMinutes } = currentQuiz;
        
        const attempt1 = await UserQuizAttempt.findOne({
            user: userId,
            quiz_identifier: quiz_identifier,
            attempt_number: 1
        });
        
        if (!attempt1) {
            return res.json({
                status: 'PENDING_ATTEMPT_1',
                message: 'Primer intento del cuestionario requerido.',
                quizIdentifier: quiz_identifier,
                quizVersion: currentVersion,
                attemptNumber: 1
            });
        }
        
        const attempt2 = await UserQuizAttempt.findOne({
            user: userId,
            quiz_identifier: quiz_identifier,
            attempt_number: 2
        });
        
        if (!attempt2) {
            const timeBetweenAttempts = (minTimeBetweenAttemptsMinutes || 10) * 60 * 1000;
            const timeSinceAttempt1 = Date.now() - new Date(attempt1.createdAt).getTime();
            
            if (timeSinceAttempt1 >= timeBetweenAttempts) {
                return res.json({
                    status: 'PENDING_ATTEMPT_2',
                    message: 'Segundo intento del cuestionario requerido.',
                    quizIdentifier: quiz_identifier,
                    quizVersion: currentVersion,
                    attemptNumber: 2
                });
            } else {
                const nextAttemptAvailableAt = new Date(new Date(attempt1.createdAt).getTime() + timeBetweenAttempts);
                return res.json({
                    status: 'WAITING_FOR_ATTEMPT_2_WINDOW',
                    message: `Esperando el período para el segundo intento. Disponible a partir de ${nextAttemptAvailableAt.toLocaleTimeString()}.`,
                    nextAttemptAvailableAt: nextAttemptAvailableAt.toISOString()
                });
            }
        }
        
        return res.json({
            status: 'COMPLETED',
            message: 'Ambos intentos del cuestionario completados.'
        });
        
    } catch (error) {
        next(error);
    }
};


exports.submitUserAttempt = async (req, res, next) => {
    const userId = req.userId;
    const { quizIdentifier, quizVersion, attemptNumber, answers } = req.body;
    
    if (!quizIdentifier || quizVersion === undefined || !attemptNumber || !Array.isArray(answers)) {
        return res.status(400).json({ message: 'Datos de envío inválidos.' });
    }
    
    try {
        const currentQuizData = await getCurrentQuizData();
        
        if (currentQuizData.quiz_identifier !== quizIdentifier) {
            return res.status(409).json({ message: 'Identificador de quiz no coincide con el actual.' });
        }
        if (currentQuizData.version !== parseInt(quizVersion)) {
            return res.status(409).json({
                message: `La versión del cuestionario ha cambiado. Por favor, recarga e inténtalo de nuevo. (Esperada ${currentQuizData.version}, recibida ${quizVersion})`
            });
        }
        
        let score = 0;
        const processedAnswers = [];
        const allQuestionDefinitions = currentQuizData.questions;
        
        for (const userAnswer of answers) {
            const questionDef = allQuestionDefinitions.find(q => q.question_id === userAnswer.question_id);
            if (!questionDef) {
                console.warn(`Definición no encontrada para question_id: ${userAnswer.question_id} en el intento del usuario ${userId}`);
                return res.status(400).json({ message: `ID de pregunta inválido: ${userAnswer.question_id}` });
            }
            const isCorrect = parseInt(userAnswer.selected_option_index) === questionDef.correct_option_index;
            if (isCorrect) {
                score++;
            }
            processedAnswers.push({
                question_id: userAnswer.question_id,
                selected_option_index: parseInt(userAnswer.selected_option_index),
                is_correct: isCorrect,
            });
        }
        
        const newAttemptData = {
            user: userId,
            quiz_identifier: currentQuizData.quiz_identifier,
            quiz_version_at_attempt: currentQuizData.version,
            attempt_number: parseInt(attemptNumber),
            answers: processedAnswers,
            score: score,
            total_questions_at_attempt: allQuestionDefinitions.length
        };
        
        
        const attemptInstance = new UserQuizAttempt(newAttemptData);
        try {
            const savedAttempt = await attemptInstance.save();
            
            res.status(201).json({
                message: 'Intento enviado con éxito.',
                attemptId: savedAttempt._id,
                score: savedAttempt.score,
                totalQuestions: savedAttempt.total_questions_at_attempt
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ message: 'Este intento de cuestionario ya ha sido enviado.' });
            }
            next(error);
        }
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Este intento de cuestionario ya ha sido enviado.' });
        }
        next(error);
    }
};