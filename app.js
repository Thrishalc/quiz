"use strict";

const screens = {
  intro: document.querySelector("#intro-screen"),
  quiz: document.querySelector("#quiz-screen"),
  results: document.querySelector("#results-screen"),
};
const startButton = document.querySelector("#start-button");
const startLabel = document.querySelector("#start-label");
const loadError = document.querySelector("#load-error");
const questionCount = document.querySelector("#question-count");
const categoryLabel = document.querySelector("#category-label");
const progress = document.querySelector("#question-progress");
const progressFill = document.querySelector("#progress-fill");
const questionContent = document.querySelector("#question-content");
const questionTitle = document.querySelector("#question-title");
const optionsList = document.querySelector("#options-list");
const timer = document.querySelector("#timer");
const timerNumber = document.querySelector("#timer-number");
const timerRingFill = document.querySelector("#timer-ring-fill");
const timerBar = document.querySelector("#timer-bar");
const answerFeedback = document.querySelector("#answer-feedback");
const feedbackTitle = document.querySelector("#feedback-title");
const feedbackExplanation = document.querySelector("#feedback-explanation");
const nextButton = document.querySelector("#next-button");
const nextLabel = document.querySelector("#next-label");
const soundToggle = document.querySelector("#sound-toggle");
const soundLabel = document.querySelector("#sound-label");
const retryButton = document.querySelector("#retry-button");

const optionKeys = ["A", "B", "C", "D"];
const timerCircumference = 2 * Math.PI * 20;
const state = {
  questions: [],
  durationSeconds: 20,
  currentIndex: 0,
  answers: [],
  deadline: 0,
  intervalId: null,
  locked: false,
  soundEnabled: true,
  audioContext: null,
};

function isValidQuiz(data) {
  return (
    data &&
    Number.isInteger(data.durationSeconds) &&
    data.durationSeconds > 0 &&
    Array.isArray(data.questions) &&
    data.questions.length > 0 &&
    data.questions.every(
      (question) =>
        typeof question.category === "string" &&
        typeof question.question === "string" &&
        Array.isArray(question.options) &&
        question.options.length >= 2 &&
        question.options.every((option) => typeof option === "string") &&
        Number.isInteger(question.answer) &&
        question.answer >= 0 &&
        question.answer < question.options.length &&
        typeof question.explanation === "string",
    )
  );
}

async function loadQuiz() {
  try {
    const response = await fetch("./questions.json");
    if (!response.ok) {
      throw new Error(`The quiz data could not be loaded (HTTP ${response.status}).`);
    }
    const data = await response.json();
    if (!isValidQuiz(data)) {
      throw new Error("The quiz data is incomplete or invalid.");
    }

    state.questions = data.questions;
    state.durationSeconds = data.durationSeconds;
    document.querySelector("#question-progress").setAttribute("aria-valuemax", String(state.questions.length));
    document.querySelector("#score-count").innerHTML = `0<span> / ${state.questions.length}</span>`;
    document.querySelector(".quiz-facts > span:nth-child(1)").innerHTML =
      `<span class="fact-icon" aria-hidden="true">◷</span> ${state.durationSeconds} seconds each`;
    document.querySelector(".quiz-facts > span:nth-child(2)").innerHTML =
      `<span class="fact-icon" aria-hidden="true">✳</span> ${state.questions.length} questions`;
    startLabel.textContent = "Start the quiz";
    startButton.disabled = false;
  } catch (error) {
    startLabel.textContent = "Quiz unavailable";
    loadError.textContent = `${error.message} Please run the app from a local web server and try again.`;
    loadError.hidden = false;
  }
}

function showScreen(activeScreen) {
  Object.entries(screens).forEach(([name, screen]) => {
    screen.hidden = name !== activeScreen;
  });
}

function startQuiz() {
  state.currentIndex = 0;
  state.answers = [];
  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  clearInterval(state.intervalId);
  state.locked = false;

  const question = state.questions[state.currentIndex];
  const questionNumber = state.currentIndex + 1;
  questionCount.innerHTML = `QUESTION ${String(questionNumber).padStart(2, "0")} <span>/ ${String(state.questions.length).padStart(2, "0")}</span>`;
  categoryLabel.textContent = question.category;
  questionTitle.textContent = question.question;
  progress.setAttribute("aria-valuenow", String(questionNumber));
  progressFill.style.width = `${(questionNumber / state.questions.length) * 100}%`;
  answerFeedback.hidden = true;
  answerFeedback.classList.remove("is-incorrect");
  optionsList.replaceChildren();

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "option-button";
    button.type = "button";
    button.dataset.index = String(index);

    const key = document.createElement("span");
    key.className = "option-key";
    key.setAttribute("aria-hidden", "true");
    key.textContent = optionKeys[index] ?? String(index + 1);

    const text = document.createElement("span");
    text.className = "option-text";
    text.textContent = option;

    button.append(key, text);
    button.addEventListener("click", () => submitAnswer(index));
    optionsList.append(button);
  });

  questionContent.classList.remove("is-entering");
  requestAnimationFrame(() => questionContent.classList.add("is-entering"));
  resetTimer();
}

function resetTimer() {
  state.deadline = Date.now() + state.durationSeconds * 1000;
  timer.classList.remove("is-urgent");
  timerRingFill.style.strokeDasharray = String(timerCircumference);
  updateTimer();
  state.intervalId = window.setInterval(updateTimer, 100);
}

function updateTimer() {
  if (state.locked) return;
  const remaining = Math.max(0, state.deadline - Date.now());
  const fraction = remaining / (state.durationSeconds * 1000);
  const displayedSeconds = Math.ceil(remaining / 1000);
  timerNumber.textContent = String(displayedSeconds);
  timerBar.style.width = `${fraction * 100}%`;
  timerRingFill.style.strokeDashoffset = String(timerCircumference * (1 - fraction));
  timer.setAttribute("aria-label", `${displayedSeconds} seconds remaining`);
  timer.classList.toggle("is-urgent", displayedSeconds <= 5);
  timerBar.style.background = displayedSeconds <= 5 ? "var(--coral)" : "var(--lime)";

  if (remaining <= 0) {
    submitAnswer(null);
  }
}

function submitAnswer(selectedIndex) {
  if (state.locked) return;
  state.locked = true;
  clearInterval(state.intervalId);

  const question = state.questions[state.currentIndex];
  const isCorrect = selectedIndex === question.answer;
  state.answers[state.currentIndex] = selectedIndex;

  [...optionsList.children].forEach((button, index) => {
    button.disabled = true;
    if (index === question.answer) button.classList.add("is-correct");
    else if (index === selectedIndex) button.classList.add("is-incorrect");
  });

  answerFeedback.hidden = false;
  answerFeedback.classList.toggle("is-incorrect", !isCorrect);
  feedbackTitle.textContent = selectedIndex === null
    ? "Time's up"
    : isCorrect
      ? "That's right!"
      : "Not quite";
  feedbackExplanation.textContent = selectedIndex === null
    ? `The correct answer is ${question.options[question.answer]}. ${question.explanation}`
    : isCorrect
      ? question.explanation
      : `The correct answer is ${question.options[question.answer]}. ${question.explanation}`;
  nextLabel.textContent = state.currentIndex === state.questions.length - 1 ? "See your results" : "Next question";
  playFeedbackSound(isCorrect);
}

function advanceQuestion() {
  if (state.currentIndex + 1 === state.questions.length) {
    showResults();
    return;
  }
  state.currentIndex += 1;
  renderQuestion();
}

function showResults() {
  clearInterval(state.intervalId);
  const correctCount = state.answers.reduce(
    (total, answer, index) => total + Number(answer === state.questions[index].answer),
    0,
  );
  const percentage = Math.round((correctCount / state.questions.length) * 100);
  const remark = percentage === 100
    ? "brilliant mind."
    : percentage >= 60
      ? "curious mind."
      : "bright beginner.";

  document.querySelector("#results-remark").textContent = remark;
  document.querySelector("#score-percentage").innerHTML = `${percentage}<span>%</span>`;
  document.querySelector("#score-count").innerHTML = `${correctCount}<span> / ${state.questions.length}</span>`;
  document.querySelector("#results-description").textContent =
    `${correctCount} out of ${state.questions.length} correct. Every question is a chance to learn something new.`;
  document.querySelector("#review-summary").textContent = `${correctCount} correct · ${state.questions.length - correctCount} to revisit`;

  const reviewList = document.querySelector("#review-list");
  reviewList.replaceChildren();
  state.questions.forEach((question, index) => {
    const selectedIndex = state.answers[index];
    const isCorrect = selectedIndex === question.answer;
    const item = document.createElement("article");
    item.className = "review-item";

    const prompt = document.createElement("h3");
    prompt.className = "review-question";
    const number = document.createElement("span");
    number.className = "review-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const text = document.createElement("span");
    text.textContent = question.question;
    prompt.append(number, text);

    const answers = document.createElement("div");
    answers.className = "review-answer";
    const chosen = document.createElement("span");
    chosen.className = isCorrect ? "" : "missed-answer";
    chosen.textContent = selectedIndex === null
      ? "Your answer: Time ran out"
      : `Your answer: ${question.options[selectedIndex]}`;
    const correct = document.createElement("span");
    correct.innerHTML = `<strong>Correct: ${escapeHtml(question.options[question.answer])}</strong>`;
    answers.append(chosen, correct);

    const explanation = document.createElement("p");
    explanation.className = "review-explanation";
    explanation.textContent = question.explanation;
    item.append(prompt, answers, explanation);
    reviewList.append(item);
  });

  showScreen("results");
  document.querySelector("#question-progress").setAttribute("aria-valuenow", String(state.questions.length));
  progressFill.style.width = "100%";
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function playFeedbackSound(isCorrect) {
  if (!state.soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    state.audioContext ??= new AudioContextClass();
    if (state.audioContext.state === "suspended") state.audioContext.resume();

    const oscillator = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    const now = state.audioContext.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(isCorrect ? 660 : 240, now);
    oscillator.frequency.exponentialRampToValueAtTime(isCorrect ? 880 : 180, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(state.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
  } catch (error) {
    console.warn("Could not play the quiz feedback sound.", error);
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  soundToggle.setAttribute("aria-label", state.soundEnabled ? "Mute sound effects" : "Enable sound effects");
  soundLabel.textContent = state.soundEnabled ? "Sound on" : "Sound off";
}

startButton.addEventListener("click", startQuiz);
nextButton.addEventListener("click", advanceQuestion);
retryButton.addEventListener("click", startQuiz);
soundToggle.addEventListener("click", toggleSound);

loadQuiz();
