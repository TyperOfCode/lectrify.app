import requests
import json

SENDQUIZURL = "http://localhost:4000/"
ADMIN_SECRET = "admin"
CODE = "TEST"



def sendQuestion(question, answers, correctAnswerIdx):
  
    data = {
    "secret": ADMIN_SECRET,
    "code": CODE,
    "quizData": {
      "question": question,
      "answers" : answers,
      "correctAnswerIdx": correctAnswerIdx
    }
  }

    response = requests.post(SENDQUIZURL, json=data)
    return response.text
  