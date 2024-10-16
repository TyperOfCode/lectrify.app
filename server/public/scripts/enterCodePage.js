import { genQuizPage } from "./quizPage.js";
import { getAppData } from "./appData.js";

const AppData = getAppData();

export function genCodePage() {
  console.log("Generating Code Page");

  const element = document.getElementById("enter-code-page");
  element.classList.remove("hidden");

  const codeInput = document.getElementById("code-input");
  codeInput.value = "";

  const form = document.getElementById("enter-code-form");

  // add listeners
  form.addEventListener("submit", _handleCodeSubmit);
}

async function _handleCodeSubmit(event) {
  event.preventDefault();
  const code = document.getElementById("code-input").value;

  const exists = await _checkIfQuizExists(code);
  if (!exists) {
    _onCodeNotExist();
    return;
  }

  _routeToQuizPage(code);
}

function _onCodeNotExist() {
  // shake the code input box
  const input = document.getElementById("code-input");

  if (input.classList.contains("shake")) {
    return;
  }
  input.classList.add("shake");

  if (input.classList.contains("red-outline")) {
    return;
  }
  input.classList.add("red-outline");

  setTimeout(() => {
    input.classList.remove("shake");
    input.classList.remove("red-outline");
  }, 500);
}

function _routeToQuizPage(code) {
  const element = document.getElementById("enter-code-page");
  element.classList.add("hidden");

  genQuizPage(code);
}

async function _checkIfQuizExists(code) {
  if (!code) {
    return false;
  }

  // if code stripped length is not 4 then return
  if (code.trim().length !== 4) {
    return false;
  }

  // send code in body to /checkCode
  const res = await fetch("/checkCode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const data = await res.json();

  return data.exists;
}
