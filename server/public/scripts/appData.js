/**
 * @typedef {Object} Question
 * @property {number} questionId - the id of the question
 * @property {string} question - The question
 * @property {string[]} options - The options to choose for the question
 * @property {number} correctAnswerIdx - The index of the correct answer
 */

/**
 * @typedef {Object} UserAnswer
 * @property {id} questionId - The question id
 * @property {boolean} gotRight - Whether they got it right the first time
 * @property {number[]} tried - A list of all the option indexes they've already tried
 */

/**
 * @typedef {Object} AppData
 * @property {string|null} code - The code associated with the application data.
 * @property {Question[]|null} questionList - The list of questions
 * @property {String|null} quizTitle  - The title of the quiz
 * @property {UserAnswer[]|null} userQuestionAnswers - The user's answers to the questions
 * @property {number} atQuestion - The question the user is currently at
 */

/**
 * Retrieves the application data.
 * @returns {AppData} The application data object.
 */
const AppData = {
  code: null,
  atQuestion: 0,
};

/**
 * Retrieves the application data.
 * @returns {AppData} The application data object.
 */
export function getAppData() {
  return AppData;
}
