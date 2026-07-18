const PRESET_CONFIGS = {
  easy: {
    label: "Easy",
    eggCount: 3,
    realBunnyCount: 1,
    decoyEnabled: false,
    decoyCount: 0,
    speedKey: "slow",
    shuffleCount: 6,
    popEnabled: true,
    popDuration: 1000,
    popChance: 0.34,
    hopEnabled: false,
    hopDuration: 0,
    hopChance: 0,
    tricks: { spin: false, flash: false, disappear: false, zoom: false, distractions: false, camouflage: false }
  },
  normal: {
    label: "Normal",
    eggCount: 4,
    realBunnyCount: 1,
    decoyEnabled: false,
    decoyCount: 0,
    speedKey: "normal",
    shuffleCount: 8,
    popEnabled: true,
    popDuration: 500,
    popChance: 0.26,
    hopEnabled: false,
    hopDuration: 0,
    hopChance: 0,
    tricks: { spin: true, flash: false, disappear: false, zoom: false, distractions: false, camouflage: true }
  },
  hard: {
    label: "Hard",
    eggCount: 6,
    realBunnyCount: 1,
    decoyEnabled: true,
    decoyCount: 1,
    speedKey: "fast",
    shuffleCount: 12,
    popEnabled: false,
    popDuration: 0,
    popChance: 0,
    hopEnabled: true,
    hopDuration: 650,
    hopChance: 0.24,
    tricks: { spin: true, flash: true, disappear: true, zoom: false, distractions: true, camouflage: true }
  },
  impossible: {
    label: "Impossible",
    eggCount: 8,
    realBunnyCount: 1,
    decoyEnabled: true,
    decoyCount: 2,
    speedKey: "very-fast",
    shuffleCount: 18,
    popEnabled: false,
    popDuration: 0,
    popChance: 0,
    hopEnabled: true,
    hopDuration: 900,
    hopChance: 0.42,
    tricks: { spin: true, flash: true, disappear: true, zoom: true, distractions: true, camouflage: false }
  }
};

const SPEEDS = {
  slow: { label: "Slow", swapMs: 900, settleMs: 240 },
  normal: { label: "Regular", swapMs: 650, settleMs: 180 },
  fast: { label: "Fast", swapMs: 460, settleMs: 140 },
  "very-fast": { label: "Very Fast", swapMs: 320, settleMs: 110 }
};

const FREQUENCIES = {
  rare: 0.16,
  sometimes: 0.28,
  often: 0.42
};

const ICONS = {
  realBunny: String.fromCodePoint(0x1F430),
  decoyBunny: String.fromCodePoint(0x1F430),
  egg: String.fromCodePoint(0x1F95A),
  carrot: String.fromCodePoint(0x1F955),
  sparkles: String.fromCodePoint(0x2728)
};

const stageEl = document.getElementById("bunny-stage");
const winsEl = document.getElementById("bunny-wins");
const lossesEl = document.getElementById("bunny-losses");
const streakEl = document.getElementById("bunny-streak");
const roundsEl = document.getElementById("bunny-rounds");
const signalEl = document.getElementById("bunny-signal-light");
const statusEl = document.getElementById("bunny-status-text");
const ruleSummaryEl = document.getElementById("bunny-rule-summary");
const startButtonEl = document.getElementById("bunny-start-button");
const resetButtonEl = document.getElementById("bunny-reset-button");
const customWrapEl = document.getElementById("bunny-custom-wrap");
const levelButtons = Array.from(document.querySelectorAll("[data-bunny-level]"));

const customEggsEl = document.getElementById("bunny-custom-eggs");
const customRealCountEl = document.getElementById("bunny-custom-real-count");
const customSpeedEl = document.getElementById("bunny-custom-speed");
const customShufflesEl = document.getElementById("bunny-custom-shuffles");
const customPopEnabledEl = document.getElementById("bunny-custom-pop-enabled");
const customPopDurationEl = document.getElementById("bunny-custom-pop-duration");
const customPopFrequencyEl = document.getElementById("bunny-custom-pop-frequency");
const customHopEnabledEl = document.getElementById("bunny-custom-hop-enabled");
const customHopDurationEl = document.getElementById("bunny-custom-hop-duration");
const customHopFrequencyEl = document.getElementById("bunny-custom-hop-frequency");
const customDecoyEnabledEl = document.getElementById("bunny-custom-decoy-enabled");
const customDecoyCountEl = document.getElementById("bunny-custom-decoy-count");
const customCamouflageEl = document.getElementById("bunny-custom-camouflage");
const customSpinEl = document.getElementById("bunny-custom-spin");
const customFlashEl = document.getElementById("bunny-custom-flash");
const customDisappearEl = document.getElementById("bunny-custom-disappear");
const customZoomEl = document.getElementById("bunny-custom-zoom");
const customDistractionsEl = document.getElementById("bunny-custom-distractions");

let selectedLevel = "normal";
let activeConfig = null;
let eggs = [];
let realBunnyIds = [];
let decoyBunnyIds = [];
let selectedGuessIds = new Set();
let roundActive = false;
let isAnimating = false;
let rounds = 0;
let wins = 0;
let losses = 0;
let streak = 0;
let shuffleToken = 0;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setSignal(state) {
  signalEl.classList.remove("signal-idle", "signal-success", "signal-error");
  signalEl.classList.add(`signal-${state}`);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function updateStats() {
  winsEl.textContent = String(wins);
  lossesEl.textContent = String(losses);
  streakEl.textContent = String(streak);
  roundsEl.textContent = String(rounds);
  window.scoreTracker?.notifyScore();
}

function applyAccountScore(scoreData) {
  if (!scoreData || typeof scoreData !== "object") {
    return false;
  }

  const incomingWins = Math.max(0, Number(scoreData.wins) || 0);
  const incomingLosses = Math.max(0, Number(scoreData.losses) || 0);
  const incomingRounds = Math.max(
    incomingWins + incomingLosses,
    Math.max(0, Number(scoreData.rounds) || 0)
  );

  if (incomingRounds < rounds) {
    return false;
  }

  shuffleToken += 1;
  isAnimating = false;
  roundActive = false;
  activeConfig = null;
  rounds = incomingRounds;
  wins = incomingWins;
  losses = incomingLosses;
  streak = Math.max(0, Number(scoreData.streak) || 0);

  if (scoreData.selectedLevel && (PRESET_CONFIGS[scoreData.selectedLevel] || scoreData.selectedLevel === "custom")) {
    selectedLevel = scoreData.selectedLevel;
  }

  stageEl.innerHTML = "";
  startButtonEl.disabled = false;
  startButtonEl.textContent = "Start Round";
  updateLevelButtons();
  updateStats();
  refreshRuleSummary();
  setSignal("idle");
  setStatus("Account progress loaded. Press Start Round to continue.");
  return true;
}

function cloneConfig(config) {
  return {
    ...config,
    tricks: { ...config.tricks }
  };
}

function validateRealBunnyCount(eggCount, realBunnyCount, shouldAlert = false) {
  if (!Number.isInteger(realBunnyCount) || realBunnyCount < 1 || realBunnyCount > 8) {
    throw new Error("Real bunny count must be between 1 and 8.");
  }

  if (realBunnyCount > eggCount) {
    const message = `You picked ${realBunnyCount} real bunnies, but this level only has ${eggCount} eggs. Change to ${realBunnyCount}+ eggs first.`;
    if (shouldAlert) {
      window.alert(message);
    }
    throw new Error(message);
  }
}

function getCustomConfig(shouldAlert = false) {
  const eggCount = Number(customEggsEl.value);
  const realBunnyCount = Number(customRealCountEl.value);
  const shuffleCount = Number(customShufflesEl.value);
  const popDuration = Number(customPopDurationEl.value);
  const hopDuration = Number(customHopDurationEl.value);
  const decoyCount = Number(customDecoyCountEl.value);

  if (!Number.isInteger(eggCount) || eggCount < 3 || eggCount > 12) {
    throw new Error("Custom egg count must be between 3 and 12.");
  }

  validateRealBunnyCount(eggCount, realBunnyCount, shouldAlert);

  if (!Number.isInteger(shuffleCount) || shuffleCount < 4 || shuffleCount > 30) {
    throw new Error("Custom shuffle count must be between 4 and 30.");
  }

  if (customPopEnabledEl.checked && (!Number.isFinite(popDuration) || popDuration < 150 || popDuration > 2000)) {
    throw new Error("Pop-out time must be between 150 and 2000 ms.");
  }

  if (customHopEnabledEl.checked && (!Number.isFinite(hopDuration) || hopDuration < 150 || hopDuration > 2500)) {
    throw new Error("Hop-out time must be between 150 and 2500 ms.");
  }

  if (customDecoyEnabledEl.checked) {
    if (!Number.isInteger(decoyCount) || decoyCount < 1 || decoyCount > 4) {
      throw new Error("Decoy count must be between 1 and 4.");
    }

    if (realBunnyCount + decoyCount > eggCount) {
      throw new Error("Real bunnies plus decoys cannot be more than the total egg count.");
    }
  }

  return {
    label: "Custom",
    eggCount,
    realBunnyCount,
    decoyEnabled: customDecoyEnabledEl.checked,
    decoyCount: customDecoyEnabledEl.checked ? decoyCount : 0,
    speedKey: customSpeedEl.value,
    shuffleCount,
    popEnabled: customPopEnabledEl.checked,
    popDuration,
    popChance: FREQUENCIES[customPopFrequencyEl.value],
    hopEnabled: customHopEnabledEl.checked,
    hopDuration,
    hopChance: FREQUENCIES[customHopFrequencyEl.value],
    tricks: {
      spin: customSpinEl.checked,
      flash: customFlashEl.checked,
      disappear: customDisappearEl.checked,
      zoom: customZoomEl.checked,
      distractions: customDistractionsEl.checked,
      camouflage: customCamouflageEl.checked
    }
  };
}

function getSelectedConfig(shouldAlert = false) {
  if (selectedLevel === "custom") {
    return getCustomConfig(shouldAlert);
  }

  return cloneConfig(PRESET_CONFIGS[selectedLevel]);
}

function updateLevelButtons() {
  for (const button of levelButtons) {
    const isSelected = button.dataset.bunnyLevel === selectedLevel;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }

  customWrapEl.classList.toggle("hidden", selectedLevel !== "custom");
}

function describeConfig(config) {
  const parts = [
    `${config.label}: ${config.eggCount} eggs`,
    `${config.realBunnyCount} real ${config.realBunnyCount === 1 ? "bunny" : "bunnies"}`,
    `${SPEEDS[config.speedKey].label.toLowerCase()} speed`
  ];

  if (config.popEnabled) {
    parts.push(`peeks for ${(config.popDuration / 1000).toFixed(config.popDuration % 1000 === 0 ? 0 : 1)}s`);
  }

  if (config.hopEnabled) {
    parts.push("random hop-out");
  }

  if (config.decoyEnabled && config.decoyCount > 0) {
    parts.push(`${config.decoyCount} decoy ${config.decoyCount === 1 ? "bunny" : "bunnies"}`);
  }

  const tricks = [];
  if (config.tricks.spin) { tricks.push("spin"); }
  if (config.tricks.flash) { tricks.push("flash"); }
  if (config.tricks.disappear) { tricks.push("disappear"); }
  if (config.tricks.zoom) { tricks.push("zoom"); }
  if (config.tricks.distractions) { tricks.push("distractions"); }
  if (config.tricks.camouflage) { tricks.push("camouflage"); }

  parts.push(tricks.length ? `tricks: ${tricks.join(", ")}` : "no fancy tricks");
  return parts.join(` ${String.fromCodePoint(0x1F95A)} `);
}

function refreshRuleSummary() {
  try {
    const config = getSelectedConfig(false);
    ruleSummaryEl.textContent = describeConfig(config);
    if (!roundActive && !isAnimating) {
      setSignal("idle");
      setStatus(`${config.label} is ready. Press Start Round when you want to play.`);
    }
  } catch (error) {
    setSignal("error");
    setStatus(error.message);
  }
}

function getStagePositions(count) {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const positions = [];
  const xPadding = 12;
  const yPadding = 18;
  const usableWidth = 100 - xPadding * 2;
  const usableHeight = 100 - yPadding * 2;

  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const rowSize = row === rows - 1 ? count - row * cols : cols;
    const x = xPadding + usableWidth * ((col + 0.5) / rowSize);
    const y = yPadding + usableHeight * ((row + 0.5) / rows);
    positions.push({ x, y });
  }

  return positions;
}

function patternMarkup(index) {
  return `<span class="egg-pattern pattern-${index % 6}" aria-hidden="true"></span>`;
}

function createEggElement(id, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "egg-node";
  button.dataset.eggId = String(id);
  button.innerHTML = `
    <span class="egg-bunny egg-bunny-real" aria-hidden="true">${ICONS.realBunny}</span>
    <span class="egg-bunny egg-bunny-decoy" aria-hidden="true">${ICONS.decoyBunny}</span>
    <span class="egg-shadow" aria-hidden="true"></span>
    <span class="egg-visual" aria-hidden="true">${ICONS.egg}</span>
    ${patternMarkup(index)}
  `;
  button.addEventListener("click", () => handleEggGuess(id));
  return button;
}

function randomDistinctIds(totalCount, pickCount, bannedIds = []) {
  const blocked = new Set(bannedIds);
  const pool = [];
  for (let index = 0; index < totalCount; index += 1) {
    if (!blocked.has(index)) {
      pool.push(index);
    }
  }

  const chosen = [];
  while (chosen.length < pickCount && pool.length) {
    const pickIndex = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(pickIndex, 1)[0]);
  }
  return chosen;
}

function renderEggs() {
  const positions = getStagePositions(eggs.length);
  for (const egg of eggs) {
    const slot = positions[egg.slotIndex];
    egg.element.style.left = `${slot.x}%`;
    egg.element.style.top = `${slot.y}%`;
    egg.element.classList.toggle("has-real-bunny", realBunnyIds.includes(egg.id));
    egg.element.classList.toggle("has-decoy-bunny", decoyBunnyIds.includes(egg.id));
    egg.element.classList.toggle("is-selected-guess", selectedGuessIds.has(egg.id));
  }
}

function buildEggs(config) {
  eggs = [];
  selectedGuessIds = new Set();
  stageEl.innerHTML = "";

  for (let index = 0; index < config.eggCount; index += 1) {
    const element = createEggElement(index, index);
    stageEl.appendChild(element);
    eggs.push({ id: index, slotIndex: index, element });
  }

  realBunnyIds = randomDistinctIds(config.eggCount, config.realBunnyCount);
  decoyBunnyIds = config.decoyEnabled ? randomDistinctIds(config.eggCount, config.decoyCount, realBunnyIds) : [];

  renderEggs();
  stageEl.classList.toggle("stage-camouflage", config.tricks.camouflage);
}

function setEggButtonsDisabled(disabled) {
  for (const egg of eggs) {
    egg.element.disabled = disabled;
  }
}

function getEggById(id) {
  return eggs.find((egg) => egg.id === id) || null;
}

function clearEggEffects() {
  stageEl.classList.remove("stage-flash", "stage-zoom", "stage-camouflage-progress");
  for (const egg of eggs) {
    egg.element.classList.remove("is-peeking", "is-decoy-peeking", "is-spinning", "is-hidden-trick", "is-hop-out", "is-winner", "is-loser", "is-selected-guess");
  }
}

async function revealInitialHideout() {
  for (const bunnyId of realBunnyIds) {
    const egg = getEggById(bunnyId);
    egg?.element.classList.add("is-peeking");
  }
  if (activeConfig.decoyEnabled) {
    for (const bunnyId of decoyBunnyIds) {
      const egg = getEggById(bunnyId);
      egg?.element.classList.add("is-decoy-peeking");
    }
  }

  const bunnyLabel = activeConfig.realBunnyCount === 1 ? "real bunny is" : `real bunnies are in ${activeConfig.realBunnyCount} eggs`;
  setStatus(`The ${bunnyLabel} hiding now. Watch carefully.`);
  await wait(1200);

  for (const egg of eggs) {
    egg.element.classList.remove("is-peeking", "is-decoy-peeking");
  }
  await wait(200);
}

function chooseTwoEggs() {
  const firstIndex = Math.floor(Math.random() * eggs.length);
  let secondIndex = Math.floor(Math.random() * eggs.length);
  while (secondIndex === firstIndex) {
    secondIndex = Math.floor(Math.random() * eggs.length);
  }
  return [eggs[firstIndex], eggs[secondIndex]];
}

function swapEggSlots(firstEgg, secondEgg) {
  const originalSlot = firstEgg.slotIndex;
  firstEgg.slotIndex = secondEgg.slotIndex;
  secondEgg.slotIndex = originalSlot;
  renderEggs();
}

function maybeApplySpin(firstEgg, secondEgg, config) {
  if (!config.tricks.spin) {
    return;
  }
  firstEgg.element.classList.add("is-spinning");
  secondEgg.element.classList.add("is-spinning");
}

function clearSpin(firstEgg, secondEgg) {
  firstEgg.element.classList.remove("is-spinning");
  secondEgg.element.classList.remove("is-spinning");
}

async function maybePeek(config) {
  if (!config.popEnabled || Math.random() > config.popChance) {
    return;
  }

  const targetIds = [realBunnyIds[Math.floor(Math.random() * realBunnyIds.length)]];
  for (const bunnyId of targetIds) {
    const egg = getEggById(bunnyId);
    egg?.element.classList.add("is-peeking");
  }
  await wait(config.popDuration);
  for (const bunnyId of targetIds) {
    const egg = getEggById(bunnyId);
    egg?.element.classList.remove("is-peeking");
  }
}

async function maybeHopOut(config) {
  if (!config.hopEnabled || Math.random() > config.hopChance) {
    return;
  }

  const egg = getEggById(realBunnyIds[Math.floor(Math.random() * realBunnyIds.length)]);
  if (!egg) {
    return;
  }

  egg.element.classList.add("is-hop-out");
  await wait(config.hopDuration);
  egg.element.classList.remove("is-hop-out");
}

async function maybeDecoyPeek(config) {
  if (!config.decoyEnabled || !decoyBunnyIds.length || Math.random() > 0.3) {
    return;
  }

  const egg = getEggById(decoyBunnyIds[Math.floor(Math.random() * decoyBunnyIds.length)]);
  if (!egg) {
    return;
  }

  egg.element.classList.add("is-decoy-peeking");
  await wait(Math.max(180, Math.round(SPEEDS[config.speedKey].swapMs * 0.55)));
  egg.element.classList.remove("is-decoy-peeking");
}

async function maybeDisappear(config) {
  if (!config.tricks.disappear || Math.random() > 0.22) {
    return;
  }

  const count = config.eggCount >= 8 ? 2 : 1;
  const shuffled = [...eggs].sort(() => Math.random() - 0.5).slice(0, count);
  for (const egg of shuffled) {
    egg.element.classList.add("is-hidden-trick");
  }
  await wait(180);
  for (const egg of shuffled) {
    egg.element.classList.remove("is-hidden-trick");
  }
}

function maybeFlash(config) {
  if (config.tricks.flash && Math.random() < 0.24) {
    stageEl.classList.add("stage-flash");
    window.setTimeout(() => stageEl.classList.remove("stage-flash"), 180);
  }
}

function maybeZoom(config) {
  if (config.tricks.zoom && Math.random() < 0.2) {
    stageEl.classList.add("stage-zoom");
    window.setTimeout(() => stageEl.classList.remove("stage-zoom"), 220);
  }
}

function spawnDistraction() {
  const distraction = document.createElement("span");
  distraction.className = "stage-distraction";
  distraction.textContent = Math.random() < 0.5 ? ICONS.carrot : ICONS.sparkles;
  distraction.style.left = `${10 + Math.random() * 80}%`;
  distraction.style.top = `${12 + Math.random() * 70}%`;
  stageEl.appendChild(distraction);
  window.setTimeout(() => distraction.remove(), 900);
}

function maybeDistractions(config) {
  if (!config.tricks.distractions || Math.random() > 0.36) {
    return;
  }

  const burstCount = config.label === "Impossible" ? 3 : 2;
  for (let index = 0; index < burstCount; index += 1) {
    window.setTimeout(spawnDistraction, index * 120);
  }
}

function updateCamouflageProgress(moveIndex, totalMoves, config) {
  if (!config.tricks.camouflage) {
    stageEl.style.setProperty("--camouflage-progress", "0");
    return;
  }

  const progress = Math.min(1, (moveIndex + 1) / Math.max(totalMoves, 1));
  stageEl.style.setProperty("--camouflage-progress", progress.toFixed(3));
  stageEl.classList.add("stage-camouflage-progress");
}

async function runShuffleSequence(config, token) {
  const speed = SPEEDS[config.speedKey];
  setStatus("The eggs are shuffling. Stay with the real bunny.");

  for (let move = 0; move < config.shuffleCount; move += 1) {
    if (token !== shuffleToken) {
      return;
    }

    updateCamouflageProgress(move, config.shuffleCount, config);

    const [firstEgg, secondEgg] = chooseTwoEggs();
    maybeApplySpin(firstEgg, secondEgg, config);
    swapEggSlots(firstEgg, secondEgg);
    maybeFlash(config);
    maybeZoom(config);
    maybeDistractions(config);

    await wait(speed.swapMs);
    clearSpin(firstEgg, secondEgg);

    if ((config.label === "Hard" && Math.random() < 0.18) || (config.label === "Impossible" && Math.random() < 0.28)) {
      await maybeDisappear(config);
    }

    await maybePeek(config);
    await maybeDecoyPeek(config);
    await maybeHopOut(config);

    if (config.label === "Impossible" && Math.random() < 0.22) {
      const [thirdEgg, fourthEgg] = chooseTwoEggs();
      maybeApplySpin(thirdEgg, fourthEgg, config);
      swapEggSlots(thirdEgg, fourthEgg);
      await wait(Math.max(180, speed.swapMs - 90));
      clearSpin(thirdEgg, fourthEgg);
    }

    await wait(speed.settleMs);
  }
}

async function startRound() {
  if (isAnimating) {
    return;
  }

  try {
    activeConfig = getSelectedConfig(true);
  } catch (error) {
    setSignal("error");
    setStatus(error.message);
    return;
  }

  shuffleToken += 1;
  const token = shuffleToken;
  isAnimating = true;
  roundActive = false;
  clearEggEffects();
  buildEggs(activeConfig);
  setEggButtonsDisabled(true);
  startButtonEl.disabled = true;
  setSignal("idle");
  ruleSummaryEl.textContent = describeConfig(activeConfig);

  await revealInitialHideout();
  await runShuffleSequence(activeConfig, token);

  if (token !== shuffleToken) {
    return;
  }

  isAnimating = false;
  roundActive = true;
  selectedGuessIds = new Set();
  renderEggs();
  setEggButtonsDisabled(false);
  startButtonEl.disabled = false;
  startButtonEl.textContent = "Shuffle Again";
  setStatus(`Pick ${activeConfig.realBunnyCount} egg${activeConfig.realBunnyCount === 1 ? "" : "s"} hiding the real bunny.`);
}

function revealEggOutcome() {
  for (const egg of eggs) {
    egg.element.classList.remove("is-peeking", "is-decoy-peeking");
  }

  for (const bunnyId of realBunnyIds) {
    const egg = getEggById(bunnyId);
    egg?.element.classList.add("is-peeking", "is-winner");
  }

  for (const bunnyId of decoyBunnyIds) {
    const egg = getEggById(bunnyId);
    egg?.element.classList.add("is-decoy-peeking");
  }

  for (const guessedId of selectedGuessIds) {
    const egg = getEggById(guessedId);
    if (egg && !realBunnyIds.includes(guessedId)) {
      egg.element.classList.add("is-loser");
    }
  }
}

function guessesMatchRealBunnies() {
  if (selectedGuessIds.size !== realBunnyIds.length) {
    return false;
  }

  return realBunnyIds.every((id) => selectedGuessIds.has(id));
}

function finishGuessingRound() {
  roundActive = false;
  rounds += 1;
  setEggButtonsDisabled(true);
  revealEggOutcome();

  if (guessesMatchRealBunnies()) {
    wins += 1;
    streak += 1;
    setSignal("success");
    setStatus(`You found every real bunny. Nice catch.`);
  } else {
    losses += 1;
    streak = 0;
    setSignal("error");
    setStatus(`Close, but not quite. The real bunny${realBunnyIds.length === 1 ? " was" : "ies were"} in different egg${realBunnyIds.length === 1 ? "" : "s"}.`);
  }

  updateStats();
}

function handleEggGuess(eggId) {
  if (!roundActive || isAnimating) {
    return;
  }

  if (selectedGuessIds.has(eggId)) {
    selectedGuessIds.delete(eggId);
    renderEggs();
    setStatus(`Selection updated. Pick ${activeConfig.realBunnyCount - selectedGuessIds.size} more egg${activeConfig.realBunnyCount - selectedGuessIds.size === 1 ? "" : "s"}.`);
    return;
  }

  if (selectedGuessIds.size >= activeConfig.realBunnyCount) {
    return;
  }

  selectedGuessIds.add(eggId);
  renderEggs();

  const remaining = activeConfig.realBunnyCount - selectedGuessIds.size;
  if (remaining > 0) {
    setStatus(`Good. Pick ${remaining} more egg${remaining === 1 ? "" : "s"}.`);
    return;
  }

  finishGuessingRound();
}

function resetGame() {
  shuffleToken += 1;
  isAnimating = false;
  roundActive = false;
  eggs = [];
  realBunnyIds = [];
  decoyBunnyIds = [];
  selectedGuessIds = new Set();
  activeConfig = null;
  rounds = 0;
  wins = 0;
  losses = 0;
  streak = 0;
  stageEl.innerHTML = "";
  stageEl.style.removeProperty("--camouflage-progress");
  startButtonEl.disabled = false;
  startButtonEl.textContent = "Start Round";
  updateStats();
  setSignal("idle");
  refreshRuleSummary();
}

function selectLevel(level) {
  selectedLevel = level;
  updateLevelButtons();
  refreshRuleSummary();
}

function maybeWarnCustomRealCount() {
  if (selectedLevel !== "custom") {
    return;
  }

  try {
    const eggCount = Number(customEggsEl.value);
    const realBunnyCount = Number(customRealCountEl.value);
    validateRealBunnyCount(eggCount, realBunnyCount, true);
  } catch (error) {
    setSignal("error");
    setStatus(error.message);
  }
}

for (const button of levelButtons) {
  button.addEventListener("click", () => selectLevel(button.dataset.bunnyLevel));
}

for (const input of [
  customEggsEl,
  customRealCountEl,
  customSpeedEl,
  customShufflesEl,
  customPopEnabledEl,
  customPopDurationEl,
  customPopFrequencyEl,
  customHopEnabledEl,
  customHopDurationEl,
  customHopFrequencyEl,
  customDecoyEnabledEl,
  customDecoyCountEl,
  customCamouflageEl,
  customSpinEl,
  customFlashEl,
  customDisappearEl,
  customZoomEl,
  customDistractionsEl
]) {
  input.addEventListener("input", () => {
    if (selectedLevel === "custom") {
      refreshRuleSummary();
    }
  });
  input.addEventListener("change", () => {
    if (input === customEggsEl || input === customRealCountEl) {
      maybeWarnCustomRealCount();
    }
    if (selectedLevel === "custom") {
      refreshRuleSummary();
    }
  });
}

startButtonEl.addEventListener("click", startRound);
resetButtonEl.addEventListener("click", resetGame);

updateLevelButtons();
updateStats();
refreshRuleSummary();

window.gameScoreApi = {
  getScoreSnapshot: () => ({
    wins,
    losses,
    streak,
    rounds,
    selectedLevel,
    activeConfig: activeConfig ? { ...activeConfig, tricks: { ...activeConfig.tricks } } : null,
    updatedAt: new Date().toISOString()
  }),
  applyScoreSnapshot: applyAccountScore
};



