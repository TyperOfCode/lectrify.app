/**
 * @typedef {Object} Question
 * @property {number} questionId - The id of the question
 * @property {string} question - The question text
 * @property {string[]} options - The options to choose for the question
 * @property {number} correctAnswerIdx - The index of the correct answer
 */

/**
 * @typedef {Object} UserAnswer
 * @property {number} questionId - The question id
 * @property {boolean} gotRight - Whether the user got it right the first time
 * @property {number[]} tried - A list of all the option indexes they've already tried
 */

/**
 * @typedef {Object} AppData
 * @property {string|null} code - The code associated with the application data
 * @property {string|null} previousCode - The code associated with the previous application data
 * @property {Question[]|null} questionList - The list of questions
 * @property {string|null} quizTitle - The title of the quiz
 * @property {UserAnswer[]|null} userQuestionAnswers - The user's answers to the questions
 * @property {number} atQuestion - The question the user is currently at
 * @property {string} redirectOnEnd - The URL to redirect to when the quiz ends.
 */

/**
 * Retrieves the application data.
 * @returns {AppData} The application data object.
 */
const AppData = {
  code: null,
  previousCode: null,
  atQuestion: 0,
  redirectOnEnd: "https://devpost.com/software/lectrify-app",
  // redirectOnEnd: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

/**
 * Retrieves the application data.
 * @returns {AppData} The application data object.
 */
export function getAppData() {
  return AppData;
}

// ................................ app data controller

export function setAppDataCode(code) {
  AppData.code = code;

  saveAppData();
}

export function setAppDataPreviousCode(previousCode) {
  AppData.previousCode = previousCode;

  saveAppData();
}

export function setQuestionList(questionList) {
  AppData.questionList = questionList;

  saveAppData();
}

export function setQuizTitle(quizTitle) {
  AppData.quizTitle = quizTitle;

  saveAppData();
}

export function setUserQuestionAnswers(userQuestionAnswers) {
  AppData.userQuestionAnswers = userQuestionAnswers;

  saveAppData();
}

export function setAtQuestion(atQuestion) {
  AppData.atQuestion = atQuestion;

  saveAppData();
}

export function addUserQuestionAnswer(questionId, gotRight) {
  AppData.userQuestionAnswers.push({
    questionId,
    gotRight,
    tried: [],
  });

  saveAppData();
}

export function addTriedToUserQuestionAnswers(questionId, chosenIndex) {
  const userQuestionAnswers = AppData.userQuestionAnswers;
  const userAnswer = userQuestionAnswers.find(
    (answer) => answer.questionId === questionId
  );

  if (!userAnswer) {
    return;
  }

  if (userAnswer.tried === undefined) {
    userAnswer.tried = [];
  }

  if (userAnswer.tried.includes(chosenIndex)) {
    return;
  }

  userAnswer.tried.push(chosenIndex);

  saveAppData();
}

// ................................ local storage controller

export function clearLocalStorage() {
  localStorage.clear();
}

export function clearAppData() {
  AppData.code = null;
  AppData.questionList = [];
  AppData.quizTitle = null;
  AppData.userQuestionAnswers = [];
  AppData.atQuestion = 0;

  clearLocalStorage();
}

export function setRedirectOnEnd(redirectOnEnd) {
  AppData.redirectOnEnd = redirectOnEnd;

  saveAppData();
}

export function saveAppData() {
  localStorage.setItem("appData", JSON.stringify(AppData));
}

export function loadAppData() {
  const data = localStorage.getItem("appData");
  if (data) {
    Object.assign(AppData, JSON.parse(data));
  }
}
