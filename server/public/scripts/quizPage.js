import {
  getAppData,
  clearLocalStorage,
  saveAppData,
  loadAppData,
  clearAppData,
  setAppDataCode,
  setAtQuestion,
  setQuizTitle,
  setUserQuestionAnswers,
  addTriedToUserQuestionAnswers,
  addUserQuestionAnswer,
  setQuestionList,
} from "./appData.js";
import { genCodePage } from "./enterCodePage.js";

const AppData = getAppData();
const mediaQuery = window.matchMedia("(max-width: 600px)");

let currentReconnects = 0;
const maxReconnects = 3;

export async function genQuizPage(code) {
  console.log("Generating Quiz Page");

  loadAppData();

  if (code !== AppData.code) {
    clearAppData();

    setAppDataCode(code);
  }

  try {
    await _initialAppState();
    _subscribeToEventStream();
    _updateQuizToQuestion(null);
    _attachQuizNavigationButtons();
    _handleViewportChange(mediaQuery);
  } catch (error) {
    console.error("Error generating quiz page:", error);
  }

  const element = document.getElementById("quiz-page-container");
  element.classList.remove("hidden");

  const quizCode = document.getElementById("quiz-code");
  quizCode.innerHTML = AppData.code;
}

function _subscribeToEventStream() {
  const eventSource = new EventSource(
    `/sse/subscribeToLecture?code=${encodeURIComponent(AppData.code)}`
  );

  eventSource.onopen = () => {
    console.log("Connection to the server has been established.");
    currentReconnects = 0;
  };

  eventSource.onmessage = (event) => {
    const questionList = JSON.parse(atob(event.data));
    _onReceiveQuestionList(questionList);
  };

  eventSource.onerror = (error) => {
    console.error("Error occurred or connection lost:", error);

    if (eventSource.readyState === EventSource.CLOSED) {
      currentReconnects++;

      if (currentReconnects >= maxReconnects) {
        console.log("Max reconnection attempts reached. closing...");
        eventSource.close();
        _routeToCodePage();
      }
    }
  };
}

function _onReceiveQuestionList(questionList) {
  console.log("Received quiz list: ", questionList);

  if (!AppData.questionList) {
    _handleQuizEmpty();
  }

  if (AppData.questionList === undefined || AppData.questionList.length === 0) {
    console.log("No question list found. Setting to end");
    AppData.atQuestion = questionList.length - 1;
  }

  setQuestionList(questionList);

  // if the user is at the last question, move them to the next question
  if (AppData.atQuestion === AppData.questionList.length - 2) {
    setAtQuestion(AppData.atQuestion + 1);
  }

  _updateQuizUI();
}

async function _initialAppState() {
  const code = AppData.code;

  if (!code) {
    return false;
  }

  console.log("Fetching data for code: ", code);

  const res = await fetch("/getQuizTitle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const data = await res.json();

  console.log("Received data: ", data);

  setQuizTitle(data.quizTitle);

  // set question list to null first.
  setQuestionList([]);

  const element = document.getElementById("quiz-title");
  element.innerHTML = AppData.quizTitle;
}

function _routeToCodePage() {
  console.log("Routing to code page...");
  const element = document.getElementById("quiz-page-container");
  element.classList.add("hidden");

  genCodePage();
}

// ................................ quiz controller

function _updateQuizToQuestion(questionId) {
  setAtQuestion(questionId);
  _updateQuizUI();
}

function _updateQuizUI() {
  if (AppData.atQuestion == null) {
    setAtQuestion(0);
  }

  if (AppData.questionList === undefined || AppData.questionList.length === 0) {
    _handleQuizEmpty();
    return;
  }

  const question = AppData.questionList[AppData.atQuestion];

  const waitingBox = document.getElementById("waiting-box");
  waitingBox.classList.add("hidden");

  const questionElement = document.getElementById("quiz-question");

  const answerListElement = document.getElementById("quiz-answers");

  questionElement.innerHTML = "";
  // add question icon to answer
  const questionIcon = document.createElement("div");
  questionIcon.classList.add("container-icon-p", "primary-text");
  questionIcon.innerHTML = `Q${AppData.atQuestion + 1}`;

  questionElement.appendChild(questionIcon);
  /////////////////////////////////////////

  // add question label to the element
  const questionLabel = document.createElement("div");
  questionLabel.classList.add("container-title");
  questionLabel.innerHTML = question.question;

  questionElement.appendChild(questionLabel);
  /////////////////////////////////////////

  answerListElement.innerHTML = "";

  question.options.forEach((answer, index) => {
    const {
      container: answerElement,
      containerIcon,
      containerLabel,
    } = _createQuestionContainer(
      String.fromCharCode(65 + (index % 26)),
      answer
    );

    answerElement.onclick = async () =>
      await _onAnswerClick(
        question.questionId,
        index,
        question.correctAnswerIdx,
        answerElement,
        containerIcon,
        index === question.correctAnswerIdx
      );

    // check if there is an answer to this question
    const answerIndex = AppData.userQuestionAnswers.findIndex(
      (answer) => answer.questionId === question.questionId
    );

    if (answerIndex !== -1) {
      const answer = AppData.userQuestionAnswers[answerIndex];

      if (answer.tried.includes(index)) {
        if (index === question.correctAnswerIdx) {
          answerElement.classList.add("green-box");
          containerIcon.classList.add("green-text");
        } else {
          answerElement.classList.add("red-box");
          containerIcon.classList.add("red-text");
        }
      }
    }

    answerListElement.appendChild(answerElement);
  });

  // make elements visible
  questionElement.classList.remove("hidden");
  answerListElement.classList.remove("hidden");

  // update button state
  _updateButtonEnabledState();
  _updateProgressBar();
}

function _handleQuizEmpty() {
  const waitingBox = document.getElementById("waiting-box");
  waitingBox.classList.remove("hidden");

  const questionElement = document.getElementById("quiz-question");
  questionElement.classList.add("hidden");

  const answerListElement = document.getElementById("quiz-answers");
  answerListElement.classList.add("hidden");
}

async function _onAnswerClick(
  questionId,
  chosenIndex,
  correctIndex,
  answerElement,
  containerIcon,
  isCorrect
) {
  let answerIndex = AppData.userQuestionAnswers.findIndex(
    (answer) => answer.questionId === questionId
  );

  if (answerIndex == -1) {
    addUserQuestionAnswer(questionId, isCorrect);

    _sendAnswerToServer(questionId, chosenIndex);
    answerIndex = AppData.userQuestionAnswers.length - 1;
  }

  if (AppData.userQuestionAnswers[answerIndex].tried.includes(correctIndex)) {
    return;
  }

  if (AppData.userQuestionAnswers[answerIndex].tried.includes(chosenIndex)) {
    return;
  }

  if (isCorrect) {
    answerElement.classList.add("green-box");
    containerIcon.classList.add("green-text");
  } else {
    answerElement.classList.add("red-box");
    containerIcon.classList.add("red-text");
  }

  addTriedToUserQuestionAnswers(questionId, chosenIndex);
  _updateProgressBar();

  console.log(AppData);
}

async function _sendAnswerToServer(questionId, answerIdx) {
  const code = AppData.code;

  if (!code) {
    return false;
  }

  // if code stripped length is not 4 then return
  if (code.trim().length !== 4) {
    return false;
  }

  const res = await fetch("/submitAnswerStat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, questionId, answerIdx }),
  });

  const data = await res.json();

  console.log("Submitted answer: ", data);
}

function _createQuestionContainer(icon, label) {
  const container = document.createElement("div");
  container.classList.add("styled-box", "clickable");

  // add question icon to answer
  const containerIcon = document.createElement("div");
  containerIcon.classList.add("container-icon");
  containerIcon.innerHTML = icon;

  container.appendChild(containerIcon);
  /////////////////////////////////////////

  // add question label to the element
  const containerLabel = document.createElement("div");
  containerLabel.classList.add("container-label");
  containerLabel.innerHTML = label;

  container.appendChild(containerLabel);
  /////////////////////////////////////////

  return { container, containerIcon, containerLabel };
}

// .......................................... quiz navigate buttons

function _updateButtonEnabledState() {
  // phone buttons
  const prevButtonPh = document.getElementById("go-left-ph");
  const nextButtonPh = document.getElementById("go-right-ph");

  const prevButton = document.getElementById("go-left");
  const nextButton = document.getElementById("go-right");

  if (AppData.questionList === undefined || AppData.questionList.length === 0) {
    prevButton.classList.add("hidden");
    nextButton.classList.add("hidden");
  } else {
    prevButton.classList.remove("hidden");
    nextButton.classList.remove("hidden");
  }

  if (AppData.atQuestion === 0) {
    prevButtonPh.classList.add("disabled");
    prevButton.classList.add("disabled");
  } else {
    prevButtonPh.classList.remove("disabled");
    prevButton.classList.remove("disabled");
  }

  if (
    AppData.questionList === undefined ||
    AppData.atQuestion === Math.max(AppData.questionList.length - 1, 0)
  ) {
    nextButtonPh.classList.add("disabled");
    nextButton.classList.add("disabled");
  } else {
    nextButtonPh.classList.remove("disabled");
    nextButton.classList.remove("disabled");
  }
}

function _attachQuizNavigationButtons() {
  console.log("Attaching uses");
  // phone buttons
  const prevButtonPh = document.getElementById("go-left-ph");
  const nextButtonPh = document.getElementById("go-right-ph");

  prevButtonPh.onclick = _onPrevQuestion;
  nextButtonPh.onclick = _onNextQuestion;

  // desktop buttons
  const prevButton = document.getElementById("go-left");
  const nextButton = document.getElementById("go-right");

  prevButton.onclick = _onPrevQuestion;
  nextButton.onclick = _onNextQuestion;

  // close button
  const closeButton = document.getElementById("quiz-logo-title");
  closeButton.onclick = _routeToCodePage;

  _updateButtonEnabledState();
}

function _onPrevQuestion() {
  if (AppData.atQuestion === 0) {
    return;
  }

  setAtQuestion(AppData.atQuestion - 1);

  _updateButtonEnabledState();
  _updateQuizUI();
}

function _onNextQuestion() {
  if (
    AppData.questionList === undefined ||
    AppData.atQuestion === Math.max(AppData.questionList.length - 1, 0)
  ) {
    return;
  }

  setAtQuestion(AppData.atQuestion + 1);

  _updateButtonEnabledState();
  _updateQuizUI();
}

// .......................................... quiz progress bar

const progressBarPhoneState = "progress-bar-ph";
const progressBarLaptopState = "progress-bar";

let progressBarState = null;

function _updateProgressBar() {
  const progressBar = document.getElementById(progressBarState);

  progressBar.innerHTML = "";

  AppData.questionList.forEach((question, index) => {
    const percentage = 100 / AppData.questionList.length;

    const userAnswer = AppData.userQuestionAnswers.find(
      (answer) => answer.questionId === question.questionId
    );

    let color = "var(--secondary-dm)";
    if (userAnswer === undefined) {
    } else if (userAnswer.gotRight === true) {
      color = "var(--green-400)";
    } else if (userAnswer.gotRight === false) {
      color = "var(--red-400)";
    }

    let element;

    if (index === 0) {
      element = _createStartElement(
        percentage,
        color,
        AppData.atQuestion === index
      );
    } else if (index === AppData.questionList.length - 1) {
      element = _createEndElement(
        percentage,
        color,
        AppData.atQuestion === index
      );
    } else {
      element = _createMiddleElement(
        percentage,
        color,
        AppData.atQuestion === index
      );
    }

    progressBar.appendChild(element);
  });
}

function _handleViewportChange(e) {
  const progressBarPhone = document.getElementById(progressBarPhoneState);
  const progressBarLaptop = document.getElementById(progressBarLaptopState);

  if (e.matches) {
    // if phone
    if (progressBarState === progressBarPhoneState) {
      return;
    }

    progressBarState = progressBarPhoneState;

    progressBarPhone.classList.remove("hidden");
    progressBarLaptop.classList.add("hidden");

    _updateProgressBar();
  } else {
    // if laptop
    if (progressBarState === progressBarLaptopState) {
      return;
    }

    progressBarPhone.classList.add("hidden");
    progressBarLaptop.classList.remove("hidden");

    progressBarState = progressBarLaptopState;
    _updateProgressBar();
  }
}

function _createProgressElement(percentage, color, atElement = false) {
  const element = document.createElement("div");
  element.style.width = `${percentage}%`;
  element.style.height = "100%";

  element.style.backgroundColor = color;
  element.style.zIndex = "2";

  if (atElement) {
    element.style.boxShadow = "inset 0 0 0 3px var(--background-dm)";
  }

  return element;
}

function _createStartElement(percentage, color, atElement = false) {
  const element = _createProgressElement(percentage, color, atElement);

  element.style.borderTopLeftRadius = "10px";
  element.style.borderBottomLeftRadius = "10px";
  return element;
}

function _createMiddleElement(percentage, color, atElement = false) {
  return _createProgressElement(percentage, color, atElement);
}

function _createEndElement(percentage, color, atElement = false) {
  const element = _createProgressElement(percentage, color, atElement);

  element.style.borderTopRightRadius = "10px";
  element.style.borderBottomRightRadius = "10px";
  return element;
}

mediaQuery.addEventListener("change", _handleViewportChange);
