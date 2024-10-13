const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// local imports
const { quizListToB64 } = require("./quizEncoding.js");

const app = express();
const PORT = 4000;
const ORIGIN_URL = "http://localhost:4000";
const ADMIN_SECRET = "admin";

// middleware
app.use(bodyParser.json());
app.use(cors());

app.use("/admin", (req, res, next) => {
  const { secret } = req.body;
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

// static pages
app.use(express.static(path.join(__dirname, "public")));

let allQuizData = {};
let clients = [];

// receive quiz data from mic & send to listening clients
app.post("/admin/addQuiz", (req, res) => {
  const { code, quizData } = req.body;

  // quizData should follow the format of { question: string, answers: string[], correctAnswerIdx: number }
  if (!code || !quizData) {
    return res.status(400).json({ error: "Missing code or quiz data" });
  }

  if (
    !quizData.question ||
    !quizData.answers ||
    quizData.correctAnswerIdx === undefined
  ) {
    return res.status(400).json({ error: "Invalid quiz data" });
  }

  if (!allQuizData[code]) {
    allQuizData[code] = [];
  }
  
  allQuizData[code].push(quizData);

  // send quiz data to all clients
  clients.forEach((client) => {
    client.res.write(`data: ${quizListToB64(allQuizData[code])}\n\n`);
  });

  res.json({ success: true });
});

// event stream endpoint
app.get("/sse/subscribeToLecture", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Cors stuff
  res.setHeader("Access-Control-Allow-Origin", ORIGIN_URL);
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  const { code } = req.body;

  // if the code is not found, return an error
  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  // code must exist
  if (allQuizData[code] === undefined) {
    return res.status(400).json({ error: "Code doesnt exist" });
  }

  const quizList = allQuizData[code] || [];

  // load existing quiz data
  if (quizList.length > 0) {
    res.write(`data: ${quizListToB64(quizList)}\n\n`);
  }

  // add client to list
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res,
  };
  clients.push(newClient);
  console.log(`[${clients.length}] New client connected: ${clientId}`);

  // remove client from list when connection is closed
  req.on("close", () => {
    console.log(`[${clients.length}] Client disconnected: ${clientId}`);
    clients = clients.filter((client) => client.id !== clientId);
  });
});

// start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
