import math
import time
from typing import Any
from openai import OpenAI
from pydantic import BaseModel

client = OpenAI()

totalUsage = 0

class MultipleChoiceOptions(BaseModel):
  correctOption: str
  incorrectOptions: list[str]

class IsRelevantResponse(BaseModel):
  isRelevant: bool
  
class QuestionResponse(BaseModel):
  hasQuestion: bool
  extractedQuestion: str


def extractQuestion(userSpeech) -> tuple[str, int]:
  global totalUsage
  

  systemMessage = f"""
The user is speaking to an audience. 

You must determine whether or not what the user says contains a question for the audience.

Keep in mind this is transcribed text, and could have errors. 
If there are multiple questions, say only the first complete one.

Shorten question such that it is in a CONCISE quiz-format. DO NOT add any additional information. 

If the question does not make sense, set hasQuestion to false.
If there is no question, set hasQuestion to false.
  """
  
  start_time = time.time()
  completion = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
      {"role": "system", "content": systemMessage},
      {
        "role": "user",
        "content": userSpeech,
      }
    ],
    max_completion_tokens=50,
    response_format=QuestionResponse
  )
  end_time = time.time()
  elapsed_time = end_time - start_time
  
  usage = completion.usage.total_tokens
  totalUsage += usage
  
  response = completion.choices[0].message.parsed
  
  print(f"[{elapsed_time:.2f}].......................................................... Sent request extract, Usage: {completion.usage.total_tokens}\tTotal Usage: {totalUsage} ${round(0.15/1e6 * totalUsage, 5)}")
    
  print("response", response)
  if not response.hasQuestion:
    return ("NO", usage)
  
  
  
  return (response.extractedQuestion,  usage)

def determineRelevancyAndStandalone(question, themes : list[str]) -> tuple[bool, int]:
  global totalUsage
  
  systemMessage = f"""
The user is speaking to an audience. 
You must determine whether or not the question is relevant AT LEAST ONE speech themes of: {themes}.

a question is standalone if it can be asked as a MULTIPLE CHOICE quiz question.

If the question is relevant to AT LEAST ONE and can be a standalone question, set isRelevant to true.
If the question is not relevant or cannot be standalone, set isRelevant to false.
Keep in mind this is transcribed text, and could have errors, use judgement to determine if something makes sense.
  """
  
  start_time = time.time()
  completion = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
      {"role": "system", "content": systemMessage},
      {
        "role": "user",
        "content": question,
      },
    ],
    max_completion_tokens=20,
    temperature=0.0,
    response_format=IsRelevantResponse
  )
  end_time = time.time()
  elapsed_time = end_time - start_time
  
  usage = completion.usage.total_tokens
  totalUsage += usage
  
  
  response = completion.choices[0].message.parsed
  
  print(response)
  
  print(f"[{elapsed_time:.2f}].......................................................... Sent request determineRelevant, Usage: {completion.usage.total_tokens}\tTotal Usage: {totalUsage} ${round(0.15/1e6 * totalUsage, 5)}")
  
  return (response.isRelevant, completion.usage.total_tokens)

def generateMultipleChoice(question) -> tuple[IsRelevantResponse | None, int]:
  global totalUsage
  
  systemMessage = f"""
  The user will give you a question. 
  
  Generate 4 SHORT multiple choice answers for the question.
  Each answer must be concise so they can be read fast.
  
  Only 1 of them may be correct.
  3 of them must be plausible, but incorrect.
  
  The answers should be DIFFICULT and they need to make people think.
  Do not NUMBER or label the options, these labels are added later.
  """
  
  start_time = time.time()
  completion = client.beta.chat.completions.parse(
    model="gpt-4o",
    messages=[
      {"role": "system", "content": systemMessage},
      {
        "role": "user",
        "content": question,
      },
    ],
    max_completion_tokens=200,
    temperature=1,
    response_format=MultipleChoiceOptions
  )
  
  end_time = time.time()
  elapsed_time = end_time - start_time
  
  usage = math.floor(16.67*completion.usage.total_tokens)
  totalUsage += usage
  
  print(f"[{elapsed_time:.2f}].......................................................... Sent request generateQuestion, Usage: {usage}\tTotal Usage: {totalUsage} ${round(0.15/1e6 * totalUsage, 5)}")
  
  return (completion.choices[0].message.parsed, usage)


