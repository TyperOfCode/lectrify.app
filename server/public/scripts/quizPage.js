import { getAppData } from "./appData.js";
import { genCodePage } from "./enterCodePage.js";

const AppData = getAppData();

export function genQuizPage() {
  console.log("Generating Quiz Page");

  subscribeToEventStream();

  const element = document.getElementById("quiz-container");
  element.classList.remove("hidden");

  const title = document.getElementById("quiz-code");
  title.innerHTML = AppData.code;
}

function subscribeToEventStream() {
  const eventSource = new EventSource(
    `/sse/subscribeToLecture?code=${encodeURIComponent(AppData.code)}`
  );

  eventSource.onopen = () => {
    console.log("Connection to the server has been established.");
  };

  eventSource.onmessage = (event) => {
    console.log("Quiz list updated: ", event.data);

    const quizList = JSON.parse(atob(event.data));

    onReceiveQuizList(quizList);
  };

  eventSource.onerror = (error) => {
    console.error("Error occurred:", error);
    eventSource.close();

    _routeToCodePage();
  };
}

function onReceiveQuizList(quizList) {
  console.log("Received quiz list: ", quizList);

  AppData.quizList = quizList;
}

function _routeToCodePage() {
  const element = document.getElementById("quiz-container");
  element.classList.add("hidden");

  genCodePage();
}
