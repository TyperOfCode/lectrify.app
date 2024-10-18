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
  setAppDataPreviousCode,
} from "./appData.js";
import { genCodePage } from "./enterCodePage.js";

const AppData = getAppData();
const mediaQuery = window.matchMedia("(max-width: 600px)");

let currentReconnects = 0;
const maxReconnects = 3;

export async function genQuizPage(code) {
  console.log("Generating Quiz Page");

  loadAppData();

  if (AppData.previousCode === code) {
    setAppDataCode(code);
  }

  if (AppData.code !== code) {
    clearAppData();
  }

  if (AppData.code === null) {
    setAppDataCode(code);
    setAppDataPreviousCode(null);
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

    if (questionList.endQuiz === true) {
      console.log("Quiz has ended. Closing connection...");
      eventSource.close();

      window.location.href = AppData.redirectOnEnd;
    }

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

  let beforeState = [...AppData.questionList];

  if (AppData.questionList === undefined || AppData.questionList.length === 0) {
    console.log("No question list found. Setting to end");
    AppData.atQuestion = questionList.length - 1;
  }

  setQuestionList(questionList);

  // if the user is at the last question, move them to the next question
  if (AppData.atQuestion === AppData.questionList.length - 2) {
    setAtQuestion(AppData.atQuestion + 1);
  }

  if (beforeState.length === 0 && AppData.questionList.length > 0) {
    _handleViewportChange(mediaQuery);
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

  setAppDataPreviousCode(AppData.code);
  setAppDataCode(null);

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

  if (AppData.atQuestion == AppData.questionList.length) {
    // if we're out of the question list bounds
    _displayWaitingForQuestion();
    _updateProgressBar();
    return;
  }
  _removeWaitingForQuestion();

  const waitingBox = document.getElementById("waiting-box");
  const questionElement = document.getElementById("quiz-question");
  const answerListElement = document.getElementById("quiz-answers");

  const question = AppData.questionList[AppData.atQuestion];
  waitingBox.classList.add("hidden");

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

  setAtQuestion(0);
  _updateButtonEnabledState();
  _updateProgressBar();
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

function _displayWaitingForQuestion() {
  const questionElement = document.getElementById("quiz-question");
  questionElement.innerHTML = "";

  questionElement.classList.remove("hidden", "primary-box");
  questionElement.classList.add("alt-box");

  // add question icon to answer
  const questionIcon = document.createElement("div");
  questionIcon.classList.add("container-icon", "alt-text");
  questionIcon.innerHTML = "?";

  questionElement.appendChild(questionIcon);
  /////////////////////////////////////////

  // add question label to the element
  const questionLabel = document.createElement("div");
  questionLabel.classList.add("container-title");
  questionLabel.innerHTML = "Waiting for next question...";

  questionElement.appendChild(questionLabel);
  /////////////////////////////////////////

  const answerListElement = document.getElementById("quiz-answers");
  answerListElement.classList.add("hidden");
}

function _removeWaitingForQuestion() {
  const questionElement = document.getElementById("quiz-question");
  questionElement.innerHTML = "";

  questionElement.classList.remove("alt-box");
  questionElement.classList.add("hidden", "primary-box");
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

  if (AppData.atQuestion === AppData.questionList.length) {
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
    AppData.atQuestion === AppData.questionList.length
  ) {
    return;
  }

  setAtQuestion(AppData.atQuestion + 1);

  _updateButtonEnabledState();
  _updateQuizUI();
}

// handle arrow key press for the navigation functionality on laptop
document.onkeydown = (e) => {
  if (e.key === "ArrowLeft") {
    _onPrevQuestion();
  } else if (e.key === "ArrowRight") {
    _onNextQuestion();
  }
};

// .......................................... quiz progress bar

const progressBarPhoneState = "progress-bar-ph";
const progressBarLaptopState = "progress-bar";

let progressBarState = null;

function _updateProgressBar() {
  const progressBar = document.getElementById(progressBarState);
  const progressBarPhoneBox = document.getElementById("phone-progress-box");
  const progressBarLaptopBox = document.getElementById("progress-box");

  if (progressBar === null) {
    return;
  }

  if (AppData.questionList === undefined || AppData.questionList.length === 0) {
    if (progressBarState === progressBarPhoneState) {
      progressBarPhoneBox.classList.add("hidden");
    } else if (progressBarState === progressBarLaptopState) {
      progressBarLaptopBox.classList.add("hidden");
    }
    return;
  } else {
    if (progressBarState === progressBarPhoneState) {
      progressBarPhoneBox.classList.remove("hidden");
    } else if (progressBarState === progressBarLaptopState) {
      progressBarLaptopBox.classList.remove("hidden");
    }
  }

  progressBar.innerHTML = "";

  let gotRightCount = 0;
  let gotWrongCount = 0;

  let atWaitingPage = false;

  if (AppData.atQuestion === AppData.questionList.length) {
    atWaitingPage = true;
  }

  const percentage = 100 / AppData.questionList.length;
  AppData.questionList.forEach((question, index) => {
    const userAnswer = AppData.userQuestionAnswers.find(
      (answer) => answer.questionId === question.questionId
    );

    let color = "var(--secondary-dm)";
    if (userAnswer === undefined) {
    } else if (userAnswer.gotRight === true) {
      gotRightCount++;
      color = "var(--green-400)";
    } else if (userAnswer.gotRight === false) {
      gotWrongCount++;
      color = "var(--red-400)";
    }

    if (atWaitingPage && index === AppData.questionList.length - 1) {
      return;
    }

    let element;

    if (AppData.questionList.length === 1) {
      element = _createWholeElement(color, true);
    } else if (index === 0) {
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

  if (atWaitingPage) {
    let element;
    if (AppData.questionList.length === 1) {
      element = _createWholeElement("var(--alt-action-dm)", true);
    } else {
      element = _createEndElement(percentage, "var(--alt-action-dm)", true);
    }
    progressBar.appendChild(element);
  }

  let gotRightElement, gotWrongElement;
  if (progressBarState === progressBarPhoneState) {
    gotRightElement = document.getElementById("got-right-count-ph");
    gotWrongElement = document.getElementById("got-wrong-count-ph");
  } else if (progressBarState === progressBarLaptopState) {
    gotRightElement = document.getElementById("got-right-count");
    gotWrongElement = document.getElementById("got-wrong-count");
    const todoElement = document.getElementById("todo-count");
    todoElement.innerHTML =
      AppData.questionList.length - gotRightCount - gotWrongCount;
  }

  gotRightElement.innerHTML = gotRightCount;
  gotWrongElement.innerHTML = gotWrongCount;
}

function _handleViewportChange(e) {
  const progressBarPhoneBox = document.getElementById("phone-progress-box");
  const progressBarLaptopBox = document.getElementById("progress-box");

  if (e.matches) {
    // if phone
    if (progressBarState === progressBarPhoneState) {
      return;
    }

    progressBarPhoneBox.classList.remove("hidden");
    progressBarLaptopBox.classList.add("hidden");

    progressBarState = progressBarPhoneState;
    _updateProgressBar();
  } else {
    // if laptop
    if (progressBarState === progressBarLaptopState) {
      return;
    }

    progressBarPhoneBox.classList.add("hidden");
    progressBarLaptopBox.classList.remove("hidden");

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

function _createWholeElement(color, atElement = false) {
  const element = _createProgressElement(100, color, atElement);

  element.style.borderRadius = "10px";
  return element;
}

mediaQuery.addEventListener("change", _handleViewportChange);
