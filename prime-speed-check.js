const LEVELS = {
  easy: { label: "Easy", min: 0, max: 50 },
  medium: { label: "Medium", min: 0, max: 120 },
  hard: { label: "Hard", min: 0, max: 300 }
};

const correctCountEl = document.getElementById("prime-correct-count");
const wrongCountEl = document.getElementById("prime-wrong-count");
const streakCountEl = document.getElementById("prime-streak-count");
const averageTimeEl = document.getElementById("prime-average-time");
const rangeLabelEl = document.getElementById("prime-range-label");
const currentNumberEl = document.getElementById("prime-current-number");
const signalLightEl = document.getElementById("prime-signal-light");
const statusTextEl = document.getElementById("prime-status-text");
const startButtonEl = document.getElementById("prime-start-button");
const resetButtonEl = document.getElementById("prime-reset-button");
const primeYesButtonEl = document.getElementById("prime-yes-button");
const primeNoButtonEl = document.getElementById("prime-no-button");
const customRangeWrapEl = document.getElementById("custom-range-wrap");
const customMinEl = document.getElementById("custom-min");
const customMaxEl = document.getElementById("custom-max");
const levelButtons = Array.from(document.querySelectorAll("[data-level]"));

let selectedLevel = "medium";
let currentRange = { min: LEVELS.medium.min, max: LEVELS.medium.max };
let currentNumber = null;
let roundActive = false;
let correctCount = 0;
let wrongCount = 0;
let streakCount = 0;
let totalAnswerTime = 0;
let answeredCount = 0;
let currentQuestionStartedAt = 0;

function isPrimeNumber(value) {
  if (value < 2) {
    return false;
  }

  if (value === 2) {
    return true;
  }

  if (value % 2 === 0) {
    return false;
  }

  const maxFactor = Math.floor(Math.sqrt(value));
  for (let factor = 3; factor <= maxFactor; factor += 2) {
    if (value % factor === 0) {
      return false;
    }
  }

  return true;
}

function setSignal(state) {
  signalLightEl.classList.remove("signal-idle", "signal-success", "signal-error");
  signalLightEl.classList.add(`signal-${state}`);
}

function setStatus(message) {
  statusTextEl.textContent = message;
}

function setAnswerButtonsDisabled(disabled) {
  primeYesButtonEl.disabled = disabled;
  primeNoButtonEl.disabled = disabled;
}

function formatAverageTime() {
  if (!answeredCount) {
    return "-";
  }

  return `${Math.round(totalAnswerTime / answeredCount)} ms`;
}

function updateStats() {
  correctCountEl.textContent = String(correctCount);
  wrongCountEl.textContent = String(wrongCount);
  streakCountEl.textContent = String(streakCount);
  averageTimeEl.textContent = formatAverageTime();
}

function updateRangeLabel() {
  rangeLabelEl.textContent = `${currentRange.min}-${currentRange.max}`;
}

function updateLevelSelection() {
  for (const button of levelButtons) {
    const isSelected = button.dataset.level === selectedLevel;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }

  customRangeWrapEl.classList.toggle("hidden", selectedLevel !== "custom");
}

function getSelectedRange() {
  if (selectedLevel !== "custom") {
    return { ...LEVELS[selectedLevel] };
  }

  const min = Number(customMinEl.value);
  const max = Number(customMaxEl.value);

  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error("Custom range values must be whole numbers.");
  }

  if (min < 0 || max < 0) {
    throw new Error("Custom range values must be 0 or higher.");
  }

  if (max <= min) {
    throw new Error("Custom maximum must be greater than the minimum.");
  }

  if (max - min > 5000) {
    throw new Error("Custom range is too large. Keep it within 5000 numbers.");
  }

  return { label: "Custom", min, max };
}

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextQuestion() {
  currentNumber = getRandomInteger(currentRange.min, currentRange.max);
  currentQuestionStartedAt = Date.now();
  currentNumberEl.textContent = String(currentNumber);
  roundActive = true;
  setAnswerButtonsDisabled(false);
}

function startRound() {
  try {
    currentRange = getSelectedRange();
  } catch (error) {
    setSignal("error");
    setStatus(error.message);
    return;
  }

  updateRangeLabel();
  setSignal("idle");
  setStatus("Round started. Decide whether the current number is prime.");
  nextQuestion();
}

function resetScore() {
  roundActive = false;
  currentNumber = null;
  correctCount = 0;
  wrongCount = 0;
  streakCount = 0;
  totalAnswerTime = 0;
  answeredCount = 0;
  currentQuestionStartedAt = 0;
  currentNumberEl.textContent = "-";
  updateStats();
  setAnswerButtonsDisabled(true);
  setSignal("idle");
  setStatus("Score reset. Pick a level and press Start Round.");
}

function submitAnswer(userSaysPrime) {
  if (!roundActive || currentNumber === null) {
    return;
  }

  const actualPrime = isPrimeNumber(currentNumber);
  const wasCorrect = userSaysPrime === actualPrime;
  const elapsed = Math.max(Date.now() - currentQuestionStartedAt, 0);

  answeredCount += 1;
  totalAnswerTime += elapsed;

  if (wasCorrect) {
    correctCount += 1;
    streakCount += 1;
    setSignal("success");
    setStatus(`Correct. ${currentNumber} is ${actualPrime ? "prime" : "not prime"}.`);
  } else {
    wrongCount += 1;
    streakCount = 0;
    setSignal("error");
    setStatus(`Incorrect. ${currentNumber} is ${actualPrime ? "prime" : "not prime"}.`);
  }

  updateStats();
  nextQuestion();
}

function selectLevel(level) {
  selectedLevel = level;
  updateLevelSelection();

  try {
    currentRange = getSelectedRange();
    updateRangeLabel();
    if (!roundActive) {
      setStatus(`Level set to ${currentRange.label}. Press Start Round when ready.`);
    }
  } catch (error) {
    setSignal("error");
    setStatus(error.message);
  }
}

for (const button of levelButtons) {
  button.addEventListener("click", () => {
    selectLevel(button.dataset.level);
  });
}

customMinEl.addEventListener("input", () => {
  if (selectedLevel === "custom") {
    selectLevel("custom");
  }
});

customMaxEl.addEventListener("input", () => {
  if (selectedLevel === "custom") {
    selectLevel("custom");
  }
});

startButtonEl.addEventListener("click", startRound);
resetButtonEl.addEventListener("click", resetScore);
primeYesButtonEl.addEventListener("click", () => submitAnswer(true));
primeNoButtonEl.addEventListener("click", () => submitAnswer(false));

document.addEventListener("keydown", (event) => {
  if (!roundActive) {
    return;
  }

  if (event.key.toLowerCase() === "p") {
    submitAnswer(true);
  }

  if (event.key.toLowerCase() === "n") {
    submitAnswer(false);
  }
});

updateLevelSelection();
updateRangeLabel();
updateStats();
setAnswerButtonsDisabled(true);
setStatus("Medium is ready by default. Press Start Round to begin.");
