import { getAppData } from "./appData.js";

const AppData = getAppData();

export function genQuizPage() {
  console.log("Generating Quiz Page");

  const element = document.getElementById("quiz-container");
  element.classList.remove("hidden");

  const title = document.getElementById("quiz-code");
  title.innerHTML = `Lecture Code: ${AppData.code}`;
}
