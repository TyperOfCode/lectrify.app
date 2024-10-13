export function quizListToB64(quizList) {
  return btoa(JSON.stringify(quizList));
}

export function b64toQuizList(b64) {
  return JSON.parse(atob(b64));
}
