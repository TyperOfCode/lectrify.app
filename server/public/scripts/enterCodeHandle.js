import { genQuizPage } from "./quizHandle.js";
import { getAppData } from "./appData.js";

const AppData = getAppData();

export function genCodePage() {
  console.log("Generating Code Page");

  const element = document.getElementById("code-input-container");
  element.classList.remove("hidden");

  const form = document.getElementById("code-input-form");
  form.addEventListener("submit", handleCodeSubmit);
}

export function handleCodeSubmit(event) {
  event.preventDefault();
  const code = document.getElementById("code-input").value;
  console.log(code);

  // localStorage.setItem("code", code);

  AppData.code = code;

  _routeToQuizPage();
}

function _routeToQuizPage() {
  const element = document.getElementById("code-input-container");
  element.classList.add("hidden");

  genQuizPage();
}
