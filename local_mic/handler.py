import requests
import json

# SENDQUIZURL = "https://lectrify.app/admin/addQuiz"
SENDQUIZURL = "http://localhost:4000/admin/addQuiz"
ADMIN_SECRET = "admin"
CODE = "1234"



def sendQuestion(question, answers, correctAnswerIdx):
  
    data = {
      "secret": ADMIN_SECRET,
      "code": CODE,
      "questionData": {
        "question": question,
        "options" : answers,
        "correctAnswerIdx": correctAnswerIdx
      }
    }

    response = requests.post(SENDQUIZURL, json=data)
    return response.text
  