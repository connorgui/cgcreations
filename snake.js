const snakeLogic = window.snakeGameLogic;

if (!snakeLogic) {
  throw new Error("Classic Snake could not load its game logic.");
}

const {
  DEFAULT_GRID_SIZE,
  DIRECTIONS,
  createInitialState,
  requestDirection,
  stepGame
} = snakeLogic;

const scoreEl = document.getElementById("snake-score");
const bestScoreEl = document.getElementById("snake-best-score");
const lengthEl = document.getElementById("snake-length");
const stateEl = document.getElementById("snake-state");
const boardEl = document.getElementById("snake-board");
const signalEl = document.getElementById("snake-signal-light");
const statusEl = document.getElementById("snake-status-text");
const startButtonEl = document.getElementById("snake-start-button");
const restartButtonEl = document.getElementById("snake-restart-button");
const controlButtons = Array.from(document.querySelectorAll("[data-snake-direction]"));

const KEY_TO_DIRECTION = {
  ArrowUp: DIRECTIONS.up,
  ArrowDown: DIRECTIONS.down,
  ArrowLeft: DIRECTIONS.left,
  ArrowRight: DIRECTIONS.right,
  w: DIRECTIONS.up,
  a: DIRECTIONS.left,
  s: DIRECTIONS.down,
  d: DIRECTIONS.right
};

const TICK_MS = 150;
const BEST_SCORE_KEY = "snake-best-score";

let state = createInitialState({ gridSize: DEFAULT_GRID_SIZE });
let cellEls = [];
let tickIntervalId = null;
let isRunning = false;
let isPaused = false;
let bestScore = 0;

function getStoredBestScore() {
  const raw = window.localStorage.getItem(BEST_SCORE_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function persistBestScore(nextBest) {
  bestScore = Math.max(bestScore, nextBest);
  window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
}

async function syncBestScoreFromAccount() {
  const authState = window.siteAuth?.getState?.();
  if (!authState?.signedIn) {
    return;
  }

  try {
    const response = await window.fetch("/api/game-score/snake-classic", {
      method: "GET",
      credentials: "same-origin"
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json().catch(() => ({}));
    const remoteScore = Math.max(
      Number(payload?.scoreData?.score || 0),
      Number(payload?.scoreData?.bestScore || 0)
    );
    if (Number.isFinite(remoteScore) && remoteScore > bestScore) {
      persistBestScore(remoteScore);
      updateStats();
    }
  } catch {
    // Ignore account score sync failures and keep local best score.
  }
}

function cellKey(cell) {
  return `${cell.x},${cell.y}`;
}

function setSignal(signalState) {
  signalEl.classList.remove("signal-idle", "signal-success", "signal-error");
  signalEl.classList.add(`signal-${signalState}`);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function getStateLabel() {
  if (state.isGameOver) {
    return "Game Over";
  }

  if (isRunning) {
    return "Running";
  }

  if (isPaused || state.tickCount > 0) {
    return "Paused";
  }

  return "Ready";
}

function updateStats() {
  if (state.score > bestScore) {
    persistBestScore(state.score);
  }
  scoreEl.textContent = String(state.score);
  bestScoreEl.textContent = String(bestScore);
  lengthEl.textContent = String(state.snake.length);
  stateEl.textContent = getStateLabel();
  window.scoreTracker?.notifyScore();
}

function updateStartButton() {
  if (state.isGameOver) {
    startButtonEl.textContent = "Start Again";
    return;
  }

  if (isRunning) {
    startButtonEl.textContent = "Pause";
    return;
  }

  startButtonEl.textContent = state.tickCount > 0 ? "Resume" : "Start Game";
}

function buildBoard() {
  boardEl.style.setProperty("--snake-grid-size", String(state.gridSize));
  const fragment = document.createDocumentFragment();
  cellEls = [];

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const cell = document.createElement("div");
      cell.className = "snake-cell";
      cell.setAttribute("aria-hidden", "true");
      fragment.appendChild(cell);
      cellEls.push(cell);
    }
  }

  boardEl.replaceChildren(fragment);
}

function renderBoard() {
  const snakeKeys = new Set(state.snake.map(cellKey));
  const headKey = state.snake.length ? cellKey(state.snake[0]) : "";
  const foodKey = state.food ? cellKey(state.food) : "";

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const index = y * state.gridSize + x;
      const cell = cellEls[index];
      const key = `${x},${y}`;

      cell.classList.toggle("snake-cell-snake", snakeKeys.has(key));
      cell.classList.toggle("snake-cell-head", key === headKey);
      cell.classList.toggle("snake-cell-food", key === foodKey);
    }
  }
}

function clearLoop() {
  if (tickIntervalId !== null) {
    window.clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
}

function syncUi() {
  updateStats();
  updateStartButton();
  renderBoard();
}

function describeGameOver() {
  if (state.gameOverReason === "wall") {
    return "Game over. You hit the wall. Press Restart or Start Again.";
  }

  if (state.gameOverReason === "self") {
    return "Game over. You ran into your own tail. Press Restart or Start Again.";
  }

  if (state.gameOverReason === "win") {
    return "Board cleared. You filled every square.";
  }

  return "Game over. Press Restart or Start Again.";
}

function handleGameOver() {
  clearLoop();
  isRunning = false;
  isPaused = false;
  setSignal(state.gameOverReason === "win" ? "success" : "error");
  setStatus(describeGameOver());
  syncUi();
}

function runTick() {
  const previousScore = state.score;
  state = stepGame(state);

  if (state.isGameOver) {
    handleGameOver();
    return;
  }

  setSignal("idle");
  if (state.score > previousScore) {
    setSignal("success");
    setStatus(`Nice. Score ${state.score}. Keep going.`);
  }

  syncUi();
}

function resumeGame() {
  if (state.isGameOver || isRunning) {
    return;
  }

  isRunning = true;
  isPaused = false;
  tickIntervalId = window.setInterval(runTick, TICK_MS);
  setSignal("idle");
  setStatus(state.tickCount > 0
    ? "Back in motion. Stay away from the walls and your tail."
    : "Game started. Eat the food and keep the snake alive.");
  syncUi();
}

function pauseGame() {
  if (!isRunning) {
    return;
  }

  clearLoop();
  isRunning = false;
  isPaused = true;
  setSignal("idle");
  setStatus("Paused. Press Resume, Space, or a direction key to continue.");
  syncUi();
}

function restartGame(autoStart = false) {
  clearLoop();
  state = createInitialState({ gridSize: DEFAULT_GRID_SIZE });
  isRunning = false;
  isPaused = false;
  setSignal("idle");
  setStatus("Game reset. Press Start Game or use arrow keys or WASD.");
  syncUi();

  if (autoStart) {
    resumeGame();
  }
}

function handleDirectionInput(direction) {
  if (state.isGameOver) {
    return;
  }

  state = requestDirection(state, direction);
  syncUi();

  if (!isRunning) {
    resumeGame();
  }
}

function handlePrimaryButton() {
  if (state.isGameOver) {
    restartGame(true);
    return;
  }

  if (isRunning) {
    pauseGame();
    return;
  }

  resumeGame();
}

for (const button of controlButtons) {
  button.addEventListener("click", () => {
    handleDirectionInput(button.dataset.snakeDirection);
  });
}

startButtonEl.addEventListener("click", handlePrimaryButton);
restartButtonEl.addEventListener("click", () => restartGame(false));

document.addEventListener("keydown", (event) => {
  const direction = KEY_TO_DIRECTION[event.key] || KEY_TO_DIRECTION[event.key.toLowerCase()];

  if (direction) {
    event.preventDefault();
    handleDirectionInput(direction);
    return;
  }

  if (event.key === " " || event.key === "Spacebar" || event.key === "Space") {
    event.preventDefault();
    if (isRunning) {
      pauseGame();
    } else if (!state.isGameOver) {
      resumeGame();
    }
    return;
  }

  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    restartGame(false);
  }
});

buildBoard();
bestScore = getStoredBestScore();
syncUi();
setStatus("Press Start Game or use arrow keys or WASD.");
syncBestScoreFromAccount();

window.addEventListener("site-auth-change", () => {
  syncBestScoreFromAccount();
});

window.gameScoreApi = {
  getScoreSnapshot: () => ({
    score: state.score,
    bestScore,
    snakeLength: state.snake.length,
    direction: state.direction,
    food: state.food ? { ...state.food } : null,
    tickCount: state.tickCount,
    isRunning,
    isPaused,
    isGameOver: state.isGameOver,
    gameOverReason: state.gameOverReason,
    updatedAt: new Date().toISOString()
  })
};
