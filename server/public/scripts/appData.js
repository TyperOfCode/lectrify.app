/**
 * @typedef {Object} Question
 * @property {int} questionId - the id of the question
 * @property {string} question - The question
 * @property {string[]} options - The options to choose for the question
 * @property {number} correctAnswerIdx - The index of the correct answer
 */

/**
 * @typedef {Object} UserAnswer
 * @property {string} question - The question
 */

/**
 * @typedef {Object} AppData
 * @property {string|null} code - The code associated with the application data.
 * @property {Array[Question]|null} questionList - The list of questions
 * @property {String|null} quizTitle  - The title of the quiz
 * @property {String|null} userQuestionAnswers - The user's answers to the questions
 */

/**
 * Retrieves the application data.
 * @returns {AppData} The application data object.
 */
const AppData = {
  code: null,
};

/**
 * Retrieves the application data.
 * @returns {AppData} The application data object.
 */
export function getAppData() {
  return AppData;
}
