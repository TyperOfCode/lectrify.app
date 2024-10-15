import { getAppData } from "./appData.js";
import { genCodePage } from "./enterCodePage.js";

const AppData = getAppData();

let currentReconnects = 0;
const maxReconnects = 5;

export async function genQuizPage() {
  console.log("Generating Quiz Page");

  try {
    _subscribeToEventStream();
    await _initialAppState();
    _updateQuizToQuestion(null);
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
      reconnectionAttempts++;

      if (reconnectionAttempts >= maxReconnectionAttempts) {
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

  AppData.questionList = questionList;
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

  AppData.quizTitle = data.quizTitle;
  AppData.userQuestionAnswers = [];
  AppData.atQuestion = 0;

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
  AppData.atQuestion = questionId;
  _updateQuizUI();
}

function _updateQuizUI() {
  if (AppData.atQuestion == null) {
    AppData.atQuestion = 0;
  }

  if (AppData.questionList.length === 0) {
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

    answerElement.onclick = () =>
      _onAnswerClick(
        question.questionId,
        index,
        question.correctAnswerIdx,
        answerElement,
        containerIcon,
        index === question.correctAnswerIdx
      );

    answerListElement.appendChild(answerElement);
  });

  // make elements visible
  questionElement.classList.remove("hidden");
  answerListElement.classList.remove("hidden");
}

function _handleQuizEmpty() {
  const waitingBox = document.getElementById("waiting-box");
  waitingBox.classList.remove("hidden");

  const questionElement = document.getElementById("quiz-question");
  questionElement.classList.add("hidden");

  const answerListElement = document.getElementById("quiz-answers");
  answerListElement.classList.add("hidden");
}

function _onAnswerClick(
  questionId,
  chosenIndex,
  correctIndex,
  answerElement,
  containerIcon,
  isCorrect
) {
  const answerIndex = AppData.userQuestionAnswers.findIndex(
    (answer) => answer.questionId === questionId
  );

  if (isCorrect) {
    answerElement.classList.add("green-box");
    containerIcon.classList.add("green-text");
  } else {
    answerElement.classList.add("red-box");
    containerIcon.classList.add("red-text");
  }

  if (answerIndex !== -1) {
    const question = AppData.userQuestionAnswers[answerIndex];
    question.tried.push(chosenIndex);
    return;
  }

  AppData.userQuestionAnswers.push({
    questionId: questionId,
    gotRight: isCorrect,
    tried: [chosenIndex],
  });
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
