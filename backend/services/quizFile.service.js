const fs = require('fs').promises;
const path = require('path');

const questionsFile = 'questions.json';
const questionsPath = path.join(__dirname, '..', 'utils');

let quizDataCache = {
};
const cacheDuration = 5 * 60 * 1000;

async function getQuizData(filename = questionsFile) {
    const filePath = path.join(questionsPath, filename);
    const now = Date.now();

    if (quizDataCache[filename] && (now - quizDataCache[filename].timestamp < cacheDuration)) {
        return quizDataCache[filename].data;
    }

    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        
        quizDataCache[filename] = {
            data: jsonData,
            timestamp: now
        };
        return jsonData;
    } catch (error) {
        console.error(`Failed to read or parse ${filename}:`, error);
        if (quizDataCache[filename]) {
            delete quizDataCache[filename];
        }
        throw new Error(`Could not load quiz data from ${filename}.`);
    }
}

module.exports = {
    getQuizData
};