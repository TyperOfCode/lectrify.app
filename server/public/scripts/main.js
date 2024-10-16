import { genQuizPage } from "./quizPage.js";
import { genCodePage } from "./enterCodePage.js";
import { getAppData, loadAppData } from "./appData.js";

const AppData = getAppData();

function mainOnPageLoad() {
  console.log("PAGE LOADED!");

  
  let code = AppData.code;

  if (code) {
    genQuizPage();
    return;
  }

  genCodePage();
}

document.addEventListener("DOMContentLoaded", function () {
  mainOnPageLoad();
});
