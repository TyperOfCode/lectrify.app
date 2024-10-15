import { genQuizPage } from "./quizPage.js";
import { genCodePage } from "./enterCodePage.js";
import { getAppData } from "./appData.js";

const AppData = getAppData();

function mainOnPageLoad() {
  console.log("PAGE LOADED!");
  // get local storage to decide if we are on the quiz page or the code page

  let code = AppData.code;
  if (!AppData.code) {
    // code = localStorage.getItem("code");
    AppData.code = code;
  }

  if (code) {
    genQuizPage();
    return;
  }

  genCodePage();
}

document.addEventListener("DOMContentLoaded", function () {
  mainOnPageLoad();
});
