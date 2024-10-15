import express from "express";
import { static as serveStatic } from "express";
import bodyParser from "body-parser";

const { json } = bodyParser;

import cors from "cors";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

// local imports
import { quizListToB64 } from "./quizEncoding.js";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = 4000;
const ORIGIN_URL = "http://localhost:4000";
const ADMIN_SECRET = "admin";

//.......................................... middleware
app.set("trust proxy", 1);

app.use(json());
app.use(cors());

app.use("/admin", (req, res, next) => {
  const { secret } = req.body;
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

//.......................................... static pages
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(serveStatic(join(__dirname, "public")));

//.......................................... define types

/**
 * @typedef {Object} Question
 * @property {number} questionId - The ID of the question.
 * @property {string} question - The question text.
 * @property {string[]} options - The options to choose from for the question.
 * @property {number} correctAnswerIdx - The index of the correct answer.
 */

/**
 * @typedef {Object} Quiz
 * @property {number} quizId - The ID of the quiz.
 * @property {string} question - The quiz question.
 * @property {string[]} answers - The possible answers for the quiz question.
 * @property {number} correctAnswerIdx - The index of the correct answer.
 */
/**
 * @typedef {Object} RoomAppData
 * @property {Object.<number, {quizTitle: string, questionList: Quiz[]}>} roomAppData - The data structure holding quiz information for each room.
 */

//.......................................... app

/**
 * @type {RoomAppData}
 */
let roomAppData = {
  1234: {
    quizTitle: "DevSoc Demo Week 1",
    questionList: [
      // {
      //   quizId: 1,
      //   question: "What is the capital of France?",
      //   options: ["London", "Paris", "Berlin", "Madrid"],
      //   correctAnswerIdx: 1,
      // },
    ],
  },
};

let clients = [];

//.......................................... admin routes
app.post("/admin/resetQuiz", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  roomAppData[code].questionList = [];

  // send quiz data to all clients
  clients.forEach((client) => {
    client.res.write(`data: ${quizListToB64(roomAppData[code])}\n\n`);
  });

  res.json({ success: true });
});

// receive quiz data from mic & send to listening clients
app.post("/admin/addQuiz", (req, res) => {
  const { code, questionData: qData } = req.body;

  // quizData should follow the format of { question: string, answers: string[], correctAnswerIdx: number }
  if (!code || !qData) {
    return res.status(400).json({ error: "Missing code or quiz data" });
  }

  console.log("Received quiz data", qData);

  if (
    !qData.question ||
    !qData.options ||
    qData.correctAnswerIdx === undefined
  ) {
    return res.status(400).json({ error: "Invalid quiz data" });
  }

  if (!roomAppData[code]) {
    return res.status(400).json({ error: "Room code doesn't exist." });
  }

  if (!roomAppData[code].questionList) {
    roomAppData[code].questionList = [];
  }

  const questionId = Date.now();
  qData.questionId = questionId;

  roomAppData[code].questionList.push(qData);

  // send quiz data to all clients
  clients.forEach((client) => {
    client.res.write(
      `data: ${quizListToB64(roomAppData[code].questionList)}\n\n`
    );
  });

  res.json({ success: true });
});

// .......................................... client routes

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

  console.log(`[${req.ip}] Connection attempted`);

  const code = req.query.code;

  // if the code is not found, return an error
  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  // code must exist
  if (roomAppData[code] === undefined) {
    return res.status(400).json({ error: "Code doesnt exist" });
  }

  const quizList = roomAppData[code].questionList || [];

  // load existing quiz data
  if (quizList.length > 0) {
    res.write(`data: ${quizListToB64(quizList)}\n\n`);
  }

  const keepAliveInterval = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 25000);

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
    clearInterval(keepAliveInterval);
    clients = clients.filter((client) => client.id !== clientId);
    console.log(`[${clients.length}] Client disconnected: ${clientId}`);
  });
});

// check to see if quiz room exists
app.post("/checkCode", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  if (roomAppData[code] === undefined) {
    return res.json({ exists: false });
  }

  res.json({ exists: true });
});

// fetch quiz data
app.post("/getQuizTitle", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  if (roomAppData[code] === undefined) {
    return res.status(400).json({ error: "Code doesnt exist" });
  }

  res.json({ quizTitle: roomAppData[code].quizTitle });
});

// start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
