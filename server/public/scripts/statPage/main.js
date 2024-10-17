// types: pretending to be typescript part 2.3

/**
 * @typedef {Object} Question
 * @property {number} questionId - The id of the question
 * @property {string} question - The question text
 * @property {string[]} options - The options to choose for the question
 * @property {number} correctAnswerIdx - The index of the correct answer
 */

/**
 * @typedef {Object} StatOption
 * @property {number} questionId - The question id
 * @property {number[]} frequency - the frequency of each option being chosen first
 */

/**
 * @typedef {Object} RoomStats
 * @property {string} quizTitle - The title of the quiz
 * @property {Question[]} questions - The list of questions for the room
 * @property {StatOption[]} stats - the stats for each question
 */

// hard coding the code for now because i cba to make a whole auth+db system for a demo
const CODE = 1234;

/**
 * @type {RoomStats}
 * @description Holds statistical data for the room.
 */
let statData;
let atQuestion = 0;
let currentQuestionId = 0;

const styleOptions = [
  ["alt-box", "alt-text", "#e4af3a"],
  ["secondary-box", "secondary-text", "#4b576b"],
  ["red-box", "red-text", "#7d1529"],
];

const correctStyleOptions = ["green-box", "green-text", "#31cd63"];

document.addEventListener("DOMContentLoaded", async function () {
  statData = await _fetchStatData(CODE);
  mainOnPageLoad();
});

function mainOnPageLoad() {
  _initStatPage();
}

// polling for fetching updated data
setInterval(async () => {
  const prevStatData = JSON.parse(JSON.stringify(statData));
  statData = await _fetchStatData(CODE);
  _renderQuestionStats(statData, atQuestion, prevStatData, atQuestion);
}, 5 * 1000);

//....................................... Code for the stat page....
// this will be hella rushed lol.

function _initStatPage() {
  _renderQuestionStats(statData, atQuestion, undefined, undefined);
  _attachQuizNavigationButtons();
}

/**
 * @param {RoomStats} statData
 * @param {RoomStats} prevStatData
 * @param {number} atQuestion
 * @param {number} prevAtQuestion
 */
function _renderQuestionStats(
  statData,
  atQuestion,
  prevStatData,
  prevAtQuestion
) {
  // check if changed

  // console.log("prevStatData: ", prevStatData);
  // console.log("statData: ", statData);

  // console.log("prevAtQuestion: ", prevAtQuestion);
  // console.log("atQuestion: ", atQuestion);

  if (
    prevStatData &&
    JSON.stringify(statData) === JSON.stringify(prevStatData) &&
    prevAtQuestion !== undefined &&
    atQuestion === prevAtQuestion
  ) {
    console.log("No change in data");
    return;
  }

  console.log("Rendering ", statData, atQuestion);
  _updateButtonEnabledState();

  // rendering title
  const title = document.getElementById("quiz-title");
  title.innerHTML =
    statData.roomTitle === undefined || statData.roomTitle === ""
      ? "Quiz Title"
      : statData.roomTitle;

  // rendering room code
  const code = document.getElementById("quiz-code");
  code.innerHTML = CODE;

  if (statData.questions.length === 0) {
    _displayWaitingForQuestion();
    _renderEmptyPieChart();
    return;
  }

  atQuestion = atQuestion % statData.questions.length;

  const question = statData.questions[atQuestion];

  _displayQuestion(question);
  _renderTotalAnswers();
  _renderPieChart();
}

/**
 *
 * @param {number} code
 * @returns {Promise<RoomStats>}
 */
async function _fetchStatData(code) {
  const res = await fetch("/getStatsForRoom", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: code }),
  });

  const data = await res.json();

  return data;
}

//....................................... Question navigation

function _attachQuizNavigationButtons() {
  const prevButton = document.getElementById("go-left");
  prevButton.addEventListener("click", _onPrevQuestion);

  const nextButton = document.getElementById("go-right");
  nextButton.addEventListener("click", _onNextQuestion);
}

function _updateButtonEnabledState() {
  const prevButton = document.getElementById("go-left");
  const nextButton = document.getElementById("go-right");

  if (statData.questions === undefined || statData.questions.length === 0) {
    prevButton.classList.add("hidden");
    nextButton.classList.add("hidden");
  } else {
    prevButton.classList.remove("hidden");
    nextButton.classList.remove("hidden");
  }

  if (atQuestion === 0) {
    prevButton.classList.add("disabled");
  } else {
    prevButton.classList.remove("disabled");
  }

  if (atQuestion === statData.questions.length - 1) {
    nextButton.classList.add("disabled");
  } else {
    nextButton.classList.remove("disabled");
  }
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

function _displayQuestionTitle(question) {
  const questionElement = document.getElementById("quiz-question");
  questionElement.classList.remove("hidden", "alt-box");
  questionElement.classList.add("primary-box");
  questionElement.innerHTML = "";
  // add question icon to answer
  const questionIcon = document.createElement("div");
  questionIcon.classList.add("container-icon-p", "primary-text");
  questionIcon.innerHTML = `Q${atQuestion + 1}`;

  questionElement.appendChild(questionIcon);
  /////////////////////////////////////////

  // add question label to the element
  const questionLabel = document.createElement("div");
  questionLabel.classList.add("container-title");
  questionLabel.innerHTML = question;

  questionElement.appendChild(questionLabel);
  /////////////////////////////////////////
}

function _createQuestionContainer(icon, label, count = 0) {
  const container = document.createElement("div");
  container.classList.add("styled-box");

  // generate container icon column
  const containerIconColumn = document.createElement("div");
  containerIconColumn.classList.add("column-flex-center");

  // add question icon to column
  const containerIcon = document.createElement("div");
  containerIcon.classList.add("container-icon");
  containerIcon.innerHTML = icon;

  // add stat to column
  const countElement = document.createElement("div");
  countElement.classList.add("container-icon-count");
  countElement.innerHTML = count;

  containerIconColumn.appendChild(containerIcon);
  containerIconColumn.appendChild(countElement);

  container.appendChild(containerIconColumn);
  /////////////////////////////////////////

  // add question label to the element
  const containerLabel = document.createElement("div");
  containerLabel.classList.add("container-label");
  containerLabel.innerHTML = label;

  container.appendChild(containerLabel);
  /////////////////////////////////////////

  return { container, containerIcon, countElement, containerLabel };
}

function _addQuestionOption(
  option,
  index,
  boxOption,
  iconOption,
  haveBackground = false,
  count = 0
) {
  const answerListElement = document.getElementById("quiz-answers");
  const {
    container: answerElement,
    containerIcon,
    countElement,
    containerLabel,
  } = _createQuestionContainer(
    String.fromCharCode(65 + (index % 26)),
    option,
    count
  );

  if (!haveBackground) {
    answerElement.classList.add("no-background");
  }
  answerElement.classList.add(boxOption);

  countElement.classList.add(iconOption);
  containerIcon.classList.add(iconOption);

  answerListElement.appendChild(answerElement);
}

function _addOptions(options, correctIndex) {
  const answerListElement = document.getElementById("quiz-answers");
  answerListElement.innerHTML = "";

  let styleIndex = 0;

  options.forEach((option, index) => {
    let boxOption, iconOption;
    let hasBackground = false;

    if (index !== correctIndex) {
      boxOption = styleOptions[styleIndex][0];
      iconOption = styleOptions[styleIndex][1];
      styleIndex = (styleIndex + 1) % styleOptions.length;
    } else {
      boxOption = correctStyleOptions[0];
      iconOption = correctStyleOptions[1];
      hasBackground = true;
    }

    const count = statData.stats[atQuestion].frequency[index];

    _addQuestionOption(
      option,
      index,
      boxOption,
      iconOption,
      hasBackground,
      count
    );
  });
}

/**
 *
 * @param {Question} question
 */
function _displayQuestion(question) {
  _displayQuestionTitle(question.question);
  _addOptions(question.options, question.correctAnswerIdx);

  const answerListElement = document.getElementById("quiz-answers");
  answerListElement.classList.remove("hidden");
}

function _onPrevQuestion() {
  if (statData.questions.length === 0) {
    return;
  }

  if (atQuestion <= 0) {
    return;
  }

  atQuestion--;

  _updateButtonEnabledState();
  _renderQuestionStats(statData, atQuestion, statData, atQuestion + 1);
}

function _onNextQuestion() {
  if (
    statData.questions.length === 0 ||
    atQuestion >= statData.questions.length - 1
  ) {
    return;
  }

  atQuestion++;

  _updateButtonEnabledState();
  _renderQuestionStats(statData, atQuestion, statData, atQuestion - 1);
}

function _renderTotalAnswers() {
  const question = statData.questions[atQuestion];
  const questionStat = statData.stats.find(
    (stat) => stat.questionId === question.questionId
  );

  const totalQuestions = document.getElementById("total-answers");
  totalQuestions.innerHTML = questionStat.frequency.reduce(
    (acc, curr) => acc + curr
  );
}

// handle arrow key press for the navigation functionality on laptop
document.onkeydown = (e) => {
  if (e.key === "ArrowLeft") {
    _onPrevQuestion();
  } else if (e.key === "ArrowRight") {
    _onNextQuestion();
  }
};

//....................................... Wait, it's a pi- DONUT CHART?

let currentChart = null;

function _renderPieChart() {
  var ctx = document.getElementById("pie-chart").getContext("2d");

  const question = statData.questions[atQuestion];
  const questionStat = statData.stats.find(
    (stat) => stat.questionId === question.questionId
  );

  if (questionStat === undefined) {
    _renderEmptyPieChart();
    return;
  }

  const data = questionStat.frequency;
  const correctAnswerIdx = question.correctAnswerIdx;

  if (data.reduce((acc, curr) => acc + curr) === 0) {
    _renderEmptyPieChart();
    return;
  }

  const colors = [];

  let styleIndex = 0;
  for (let i = 0; i < data.length; i++) {
    if (i === correctAnswerIdx) {
      colors.push(correctStyleOptions[2]);
    } else {
      colors.push(styleOptions[styleIndex][2]);
      styleIndex = (styleIndex + 1) % styleOptions.length;
    }
  }

  if (currentChart) {
    currentChart.destroy();
  }

  currentChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["A", "B", "C", "D"],
      datasets: [
        {
          label: question.question,
          data: data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "right",
        },
        tooltip: {
          enabled: true,
        },
      },
      cutout: "45%",
    },
  });
}

function _renderEmptyPieChart() {
  console.log("Rendering empty pie chart");
  var ctx = document.getElementById("pie-chart").getContext("2d");

  if (currentChart) {
    currentChart.destroy();
  }

  currentChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["No data"],
      datasets: [
        {
          label: "No data",
          data: [1],
          backgroundColor: ["#010922"],
          borderColor: ["#4b576b"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "right",
        },
        tooltip: {
          enabled: true,
        },
      },
      cutout: "70%",
    },
  });
}
