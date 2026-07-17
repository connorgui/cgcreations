const PI_DIGITS = "314159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196";

const DIGIT_WORDS = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  won: "1",
  two: "2",
  to: "2",
  too: "2",
  three: "3",
  four: "4",
  for: "4",
  fore: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  ate: "8",
  nine: "9"
};

const REPEAT_WORDS = {
  double: 2,
  triple: 3
};

const IGNORED_TRANSCRIPT_WORDS = new Set([
  "digit",
  "digits",
  "number",
  "numbers",
  "pi",
  "point",
  "decimal",
  "the",
  "a",
  "an",
  "and"
]);

const correctCountEl = document.getElementById("correct-count");
const wrongCountEl = document.getElementById("wrong-count");
const nextPositionEl = document.getElementById("next-position");
const nextExpectedDigitEl = document.getElementById("next-expected-digit");
const bestCorrectCountEl = document.getElementById("pi-best-count");
const signalLightEl = document.getElementById("signal-light");
const statusTextEl = document.getElementById("status-text");
const spokenDigitEl = document.getElementById("spoken-digit");
const correctSequenceEl = document.getElementById("correct-sequence");
const listenButtonEl = document.getElementById("listen-button");
const resetButtonEl = document.getElementById("reset-button");
const supportTextEl = document.getElementById("support-text");
const manualDigitEl = document.getElementById("manual-digit");
const manualSubmitEl = document.getElementById("manual-submit");
const recordSyncButtonEl = document.getElementById("pi-record-sync-button");
const recordSyncStatusEl = document.getElementById("pi-record-sync-status");

const PI_RECORD_GAME_KEY = "pi-voice-checker";
const ANONYMOUS_RECORD_KEY = "pi-voice-checker-best:anonymous";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

let recognition = null;
let listening = false;
let shouldResume = false;
let manualStopRequested = false;
let restartTimeoutId = null;
let transcriptCommitTimeoutId = null;
let micStream = null;
let micWarmupPromise = null;
let audioCaptureActive = false;
let bestTranscriptCandidate = "";
let bestTranscriptDigitCount = 0;
let correctCount = 0;
let wrongCount = 0;
let heardFinalResultThisSession = false;
let hasResultToDisplay = false;
let lastProcessedTranscript = "";
let lastProcessedAt = 0;
let bestCorrectCount = readLocalBest(ANONYMOUS_RECORD_KEY);
let activeRecordKey = ANONYMOUS_RECORD_KEY;
let signedInUsername = null;
let accountRecordLoaded = false;
let lastAccountBest = 0;
let recordSyncTimeoutId = null;
let authLoadGeneration = 0;
let anonymousRecordPendingMigration = false;

function toRecordCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function readLocalBest(key) {
  try {
    return toRecordCount(window.localStorage.getItem(key));
  } catch {
    return 0;
  }
}

function writeLocalBest(key, value) {
  try {
    window.localStorage.setItem(key, String(toRecordCount(value)));
  } catch {
    // Record syncing can still use the signed-in account if browser storage is unavailable.
  }
}

function removeLocalBest(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore browsers that block local storage.
  }
}

function getAccountRecordKey(username) {
  return `pi-voice-checker-best:account:${String(username || "").trim().toLowerCase()}`;
}

function getSavedBest(scoreData) {
  if (!scoreData || typeof scoreData !== "object") {
    return 0;
  }

  return Math.max(
    toRecordCount(scoreData.bestCorrectCount),
    toRecordCount(scoreData.correctCount)
  );
}

function setRecordSyncStatus(message) {
  if (recordSyncStatusEl) {
    recordSyncStatusEl.textContent = message;
  }
}

function renderPersonalBest() {
  if (bestCorrectCountEl) {
    bestCorrectCountEl.textContent = String(bestCorrectCount);
  }
}

function updateRecordSyncControl() {
  if (!recordSyncButtonEl) {
    return;
  }

  recordSyncButtonEl.textContent = signedInUsername
    ? "Records sync automatically"
    : "Sign in to sync records";
}

async function fetchRecordJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Record sync failed.");
  }

  return payload;
}

function queueAccountRecordSync({ force = false } = {}) {
  if (!signedInUsername || !accountRecordLoaded) {
    return;
  }

  if (!force && bestCorrectCount <= lastAccountBest) {
    return;
  }

  if (recordSyncTimeoutId !== null) {
    window.clearTimeout(recordSyncTimeoutId);
  }

  recordSyncTimeoutId = window.setTimeout(async () => {
    recordSyncTimeoutId = null;
    const usernameAtStart = signedInUsername;
    const bestAtStart = bestCorrectCount;

    try {
      await fetchRecordJson(`/api/game-score/${PI_RECORD_GAME_KEY}`, {
        method: "POST",
        body: JSON.stringify({
          scoreData: {
            bestCorrectCount: bestAtStart,
            correctCount: bestAtStart,
            correctSequence: PI_DIGITS.slice(0, bestAtStart),
            updatedAt: new Date().toISOString()
          }
        })
      });

      if (signedInUsername !== usernameAtStart) {
        return;
      }

      lastAccountBest = Math.max(lastAccountBest, bestAtStart);
      if (anonymousRecordPendingMigration) {
        removeLocalBest(ANONYMOUS_RECORD_KEY);
        anonymousRecordPendingMigration = false;
      }
      setRecordSyncStatus(`Records save automatically to ${signedInUsername}.`);

      if (bestCorrectCount > bestAtStart) {
        queueAccountRecordSync();
      }
    } catch {
      if (signedInUsername === usernameAtStart) {
        setRecordSyncStatus("Record saved in this browser. Account sync will retry with your next record.");
      }
    }
  }, 300);
}

function recordCurrentBest() {
  if (correctCount <= bestCorrectCount) {
    return;
  }

  bestCorrectCount = correctCount;
  writeLocalBest(activeRecordKey, bestCorrectCount);
  renderPersonalBest();
  queueAccountRecordSync();
}

async function loadAccountRecord(username) {
  const generation = ++authLoadGeneration;
  const accountKey = getAccountRecordKey(username);
  const anonymousBest = readLocalBest(ANONYMOUS_RECORD_KEY);
  const accountLocalBest = readLocalBest(accountKey);

  signedInUsername = username;
  activeRecordKey = accountKey;
  accountRecordLoaded = false;
  anonymousRecordPendingMigration = anonymousBest > 0;
  bestCorrectCount = Math.max(bestCorrectCount, correctCount, anonymousBest, accountLocalBest);
  writeLocalBest(activeRecordKey, bestCorrectCount);
  renderPersonalBest();
  updateRecordSyncControl();
  setRecordSyncStatus("Loading your saved Pi record...");

  try {
    const payload = await fetchRecordJson(`/api/game-score/${PI_RECORD_GAME_KEY}`, { method: "GET" });
    if (generation !== authLoadGeneration || signedInUsername !== username) {
      return;
    }

    const remoteBest = getSavedBest(payload.scoreData);
    const usesOldRecordFormat = Boolean(payload.scoreData)
      && toRecordCount(payload.scoreData.bestCorrectCount) === 0
      && remoteBest > 0;
    bestCorrectCount = Math.max(bestCorrectCount, remoteBest);
    lastAccountBest = remoteBest;
    accountRecordLoaded = true;
    writeLocalBest(activeRecordKey, bestCorrectCount);
    renderPersonalBest();
    setRecordSyncStatus(`Records save automatically to ${signedInUsername}.`);
    queueAccountRecordSync({
      force: usesOldRecordFormat || bestCorrectCount > remoteBest || anonymousRecordPendingMigration
    });
  } catch {
    if (generation !== authLoadGeneration || signedInUsername !== username) {
      return;
    }

    accountRecordLoaded = true;
    lastAccountBest = 0;
    setRecordSyncStatus("Record saved in this browser. Account sync is temporarily unavailable.");
    queueAccountRecordSync();
  }
}

function useAnonymousRecord() {
  authLoadGeneration += 1;
  signedInUsername = null;
  activeRecordKey = ANONYMOUS_RECORD_KEY;
  accountRecordLoaded = false;
  lastAccountBest = 0;
  anonymousRecordPendingMigration = false;
  bestCorrectCount = Math.max(correctCount, readLocalBest(activeRecordKey));
  writeLocalBest(activeRecordKey, bestCorrectCount);
  renderPersonalBest();
  updateRecordSyncControl();
  setRecordSyncStatus("New records save automatically in this browser. Sign in to keep them across devices.");
}

function handleAuthChange(event) {
  const auth = event.detail || {};
  if (auth.signedIn && auth.username) {
    loadAccountRecord(auth.username);
  } else {
    useAnonymousRecord();
  }
}

function clearRestartTimeout() {
  if (restartTimeoutId !== null) {
    window.clearTimeout(restartTimeoutId);
    restartTimeoutId = null;
  }
}

function clearTranscriptCommitTimeout() {
  if (transcriptCommitTimeoutId !== null) {
    window.clearTimeout(transcriptCommitTimeoutId);
    transcriptCommitTimeoutId = null;
  }
}

function updateListenButton() {
  listenButtonEl.textContent = listening ? "Stop Listening" : "Start Listening";
}

function setSignal(state) {
  signalLightEl.classList.remove("signal-idle", "signal-success", "signal-error");
  signalLightEl.classList.add(`signal-${state}`);
}

function clearDisplayedResult() {
  hasResultToDisplay = false;
  setSignal("idle");
}

async function ensureMicrophoneReady() {
  if (micStream) {
    return micStream;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return null;
  }

  if (micWarmupPromise) {
    return micWarmupPromise;
  }

  micWarmupPromise = navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      micStream = stream;
      return stream;
    })
    .catch(() => null)
    .finally(() => {
      micWarmupPromise = null;
    });

  return micWarmupPromise;
}

function previewTranscript(transcript) {
  const normalizedTranscript = normalizeTranscript(transcript);
  if (!normalizedTranscript || hasResultToDisplay) {
    return;
  }

  setSignal("idle");
  setStatus(`Hearing: ${normalizedTranscript}`);
}

function formatPiDigits(digits) {
  if (!digits) {
    return "-";
  }

  if (digits.length === 1) {
    return digits;
  }

  return `${digits[0]}.${digits.slice(1)}`;
}

function updateScoreboard() {
  correctCountEl.textContent = String(correctCount);
  wrongCountEl.textContent = String(wrongCount);
  nextPositionEl.textContent = String(correctCount + 1);
  nextExpectedDigitEl.textContent = getExpectedDigit() ?? "-";
  correctSequenceEl.textContent = formatPiDigits(PI_DIGITS.slice(0, correctCount));
  recordCurrentBest();
  window.scoreTracker?.notifyScore();
}

function incrementWrongCount() {
  wrongCount += 1;
  updateScoreboard();
}

function setStatus(message) {
  statusTextEl.textContent = message;
}

function getExpectedDigit() {
  return PI_DIGITS[correctCount] ?? null;
}

function setSpokenDigit(value) {
  spokenDigitEl.textContent = value;
}

function resetProgress() {
  correctCount = 0;
  wrongCount = 0;
  setSpokenDigit("-");
  updateScoreboard();
  clearDisplayedResult();
  setStatus("Score reset. Press start and say the first digits of Pi.");
}

function normalizeTranscript(transcript) {
  return (transcript || "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?\[\]"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDigits(transcript) {
  const cleaned = normalizeTranscript(transcript);

  if (!cleaned) {
    return [];
  }

  const tokens = cleaned.match(/[a-z]+|\d+/g) ?? [];
  const digits = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (/^\d+$/.test(token)) {
      digits.push(...token.split(""));
      continue;
    }

    if (IGNORED_TRANSCRIPT_WORDS.has(token)) {
      continue;
    }

    if (REPEAT_WORDS[token]) {
      const nextToken = tokens[index + 1];
      const repeatedDigit = nextToken
        ? (DIGIT_WORDS[nextToken] || (/^\d$/.test(nextToken) ? nextToken : null))
        : null;
      if (repeatedDigit) {
        digits.push(...Array(REPEAT_WORDS[token]).fill(repeatedDigit));
        index += 1;
      }
      continue;
    }

    if (DIGIT_WORDS[token]) {
      digits.push(DIGIT_WORDS[token]);
    }
  }

  return digits;
}

function rememberTranscriptCandidate(transcript) {
  const normalizedTranscript = normalizeTranscript(transcript);
  const digitCount = extractDigits(normalizedTranscript).length;
  if (!digitCount) {
    return;
  }

  if (
    digitCount > bestTranscriptDigitCount ||
    (digitCount === bestTranscriptDigitCount && normalizedTranscript.length > bestTranscriptCandidate.length)
  ) {
    bestTranscriptCandidate = normalizedTranscript;
    bestTranscriptDigitCount = digitCount;
  }
}

function clearTranscriptCandidate() {
  bestTranscriptCandidate = "";
  bestTranscriptDigitCount = 0;
}

function wasRecentlyProcessed(transcript) {
  return (
    transcript &&
    transcript === lastProcessedTranscript &&
    Date.now() - lastProcessedAt < 1500
  );
}

function rememberProcessedTranscript(transcript) {
  lastProcessedTranscript = transcript;
  lastProcessedAt = Date.now();
}

function commitBestTranscriptCandidate() {
  if (!bestTranscriptCandidate) {
    return false;
  }

  const transcriptToCommit = bestTranscriptCandidate;
  if (wasRecentlyProcessed(transcriptToCommit)) {
    clearTranscriptCandidate();
    return false;
  }

  const processed = submitTranscript(transcriptToCommit, { ignoreUnrecognized: true });
  clearTranscriptCandidate();
  if (processed && !processed.ignored) {
    rememberProcessedTranscript(transcriptToCommit);
    heardFinalResultThisSession = true;
  }
  return Boolean(processed && !processed.ignored);
}

function scheduleTranscriptCommit() {
  if (!bestTranscriptCandidate) {
    return;
  }

  if (isMobile && heardFinalResultThisSession) {
    return;
  }

  clearTranscriptCommitTimeout();
  transcriptCommitTimeoutId = window.setTimeout(() => {
    transcriptCommitTimeoutId = null;

    if (!bestTranscriptCandidate || (isMobile && heardFinalResultThisSession)) {
      return;
    }

    if (commitBestTranscriptCandidate() && recognition && listening && shouldResume) {
      recognition.stop();
    }
  }, isMobile ? 700 : 850);
}

function getPrimaryTranscript(result) {
  return normalizeTranscript(result?.[0]?.transcript ?? "");
}

function applyDigits(digits) {
  const consumedDigits = [];
  let incorrectDigit = null;
  let expectedDigit = getExpectedDigit();

  for (const digit of digits) {
    expectedDigit = getExpectedDigit();
    if (!expectedDigit) {
      break;
    }

    consumedDigits.push(digit);
    if (digit !== expectedDigit) {
      incorrectDigit = digit;
      break;
    }

    correctCount += 1;
  }

  updateScoreboard();
  setSpokenDigit(consumedDigits.join(" ") || digits.join(" "));

  if (incorrectDigit) {
    incrementWrongCount();
    hasResultToDisplay = true;
    setSignal("error");
    setStatus(`Heard ${incorrectDigit}, but digit ${correctCount + 1} of Pi should be ${expectedDigit}. Accepted ${Math.max(consumedDigits.length - 1, 0)} digit(s) from that phrase.`);
    return {
      ok: false,
      ignored: false,
      consumedDigits,
      incorrectDigit,
      expectedDigit,
      correctCount,
      wrongCount
    };
  }

  if (correctCount === PI_DIGITS.length) {
    shouldResume = false;
    hasResultToDisplay = true;
    setSignal("success");
    setStatus("Complete. You matched all available Pi digits in this demo.");
    if (recognition && listening) {
      recognition.stop();
    }
    return { ok: true, ignored: false, consumedDigits, incorrectDigit: null, expectedDigit: null, correctCount, wrongCount };
  }

  hasResultToDisplay = true;
  setSignal("success");
  setStatus(`Correct. Accepted ${consumedDigits.length} digit(s): ${consumedDigits.join(" ")}.`);
  return {
    ok: true,
    ignored: false,
    consumedDigits,
    incorrectDigit: null,
    expectedDigit: getExpectedDigit(),
    correctCount,
    wrongCount
  };
}

function submitTranscript(transcript, options = {}) {
  const { ignoreUnrecognized = false } = options;
  const digits = extractDigits(transcript);

  if (!digits.length) {
    if (ignoreUnrecognized) {
      return {
        ok: false,
        ignored: true,
        consumedDigits: [],
        incorrectDigit: null,
        expectedDigit: getExpectedDigit(),
        correctCount,
        wrongCount
      };
    }

    setSpokenDigit("?");
    hasResultToDisplay = true;
    setSignal("error");
    incrementWrongCount();
    setStatus(`Heard \"${transcript.trim() || "nothing"}\". Please say one or more digits.`);
    return { ok: false, ignored: false, consumedDigits: [], incorrectDigit: null, expectedDigit: getExpectedDigit(), correctCount, wrongCount };
  }

  return applyDigits(digits);
}

function processBestTranscriptCandidate() {
  clearTranscriptCommitTimeout();
  return commitBestTranscriptCandidate();
}

function startListening() {
  if (!recognition || listening) {
    return;
  }

  clearRestartTimeout();
  clearTranscriptCommitTimeout();
  manualStopRequested = false;
  shouldResume = true;
  audioCaptureActive = false;
  if (!hasResultToDisplay) {
    setSignal("idle");
  }
  setStatus("Starting microphone. Wait for the ready message, then say your digits.");

  ensureMicrophoneReady().finally(() => {
    try {
      recognition.start();
    } catch (error) {
      shouldResume = false;
      hasResultToDisplay = true;
      setSignal("error");
      setStatus(`Could not start speech recognition: ${error.message}.`);
    }
  });
}

function stopListening() {
  if (!recognition) {
    return;
  }

  clearRestartTimeout();
  clearTranscriptCommitTimeout();
  manualStopRequested = true;
  shouldResume = false;
  if (listening) {
    recognition.stop();
  }
}

function toggleListening() {
  if (listening) {
    stopListening();
    clearDisplayedResult();
    setStatus("Listening stopped.");
    return;
  }

  startListening();
}

function initRecognition() {
  if (!SpeechRecognition) {
    listenButtonEl.disabled = true;
    supportTextEl.textContent =
      "Speech recognition is not available in this browser. Use a recent Chrome or Edge build.";
    hasResultToDisplay = true;
    setStatus("Speech recognition unsupported in this browser. Use the manual test controls below.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  supportTextEl.textContent =
    "Works best in Chrome or Edge with microphone access enabled. The app listens for short spoken digit bursts and checks them as soon as the browser provides a usable transcript.";

  recognition.onstart = () => {
    listening = true;
    heardFinalResultThisSession = false;
    audioCaptureActive = false;
    clearTranscriptCommitTimeout();
    clearTranscriptCandidate();
    updateListenButton();
    if (!hasResultToDisplay) {
      setSignal("idle");
    }
    if (!hasResultToDisplay) {
      setStatus("Microphone starting. Wait for the ready message, then say your next digit or group of digits.");
    }
  };

  recognition.onaudiostart = () => {
    audioCaptureActive = true;
    if (!hasResultToDisplay) {
      setSignal("idle");
      setStatus("Microphone ready. Say your next digit or group of digits.");
    }
  };

  recognition.onaudioend = () => {
    audioCaptureActive = false;
  };

  recognition.onend = () => {
    listening = false;
    audioCaptureActive = false;
    updateListenButton();

    if (manualStopRequested) {
      manualStopRequested = false;
      clearTranscriptCommitTimeout();
      clearTranscriptCandidate();
      clearDisplayedResult();
      setStatus("Listening stopped.");
      return;
    }

    if (!heardFinalResultThisSession && processBestTranscriptCandidate()) {
      heardFinalResultThisSession = true;
    }

    if (shouldResume) {
      clearRestartTimeout();
      restartTimeoutId = window.setTimeout(() => {
        restartTimeoutId = null;
        if (!listening && shouldResume) {
          startListening();
        }
      }, 80);
      return;
    }


    if (!heardFinalResultThisSession) {
      setStatus("Listening for digits. Say numbers like 3 1 4 or 314.");
      if (!hasResultToDisplay) {
        setSignal("idle");
      }
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      shouldResume = false;
      manualStopRequested = false;
      hasResultToDisplay = true;
      setStatus("Microphone access was denied. Enable it in the browser and try again.");
      setSignal("error");
      return;
    }

    if (event.error === "aborted") {
      if (manualStopRequested) {
        return;
      }

      setStatus("Listening was interrupted. Reconnecting to the microphone.");
      if (!hasResultToDisplay) {
        setSignal("idle");
      }
      return;
    }

    if (event.error === "no-speech") {
      setStatus(audioCaptureActive
        ? "Microphone ready. No digits detected yet."
        : "Microphone still getting ready. Wait for the ready message, then try again.");
      if (!hasResultToDisplay) {
        setSignal("idle");
      }
      return;
    }

    hasResultToDisplay = true;
    setStatus(`Speech recognition error: ${event.error}.`);
    setSignal("error");
  };

  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const primaryTranscript = getPrimaryTranscript(result);
      const transcript = primaryTranscript;

      if (transcript && (!isMobile || !heardFinalResultThisSession)) {
        rememberTranscriptCandidate(transcript);
        previewTranscript(transcript);
      }

      if (!result.isFinal) {
        scheduleTranscriptCommit();
        continue;
      }

      if (isMobile && heardFinalResultThisSession) {
        continue;
      }

      if (transcript) {
        if (commitBestTranscriptCandidate() && recognition && listening && shouldResume) {
          recognition.stop();
        }
      }
    }
  };
}

function submitManualDigits() {
  const value = manualDigitEl.value.trim();
  manualDigitEl.value = "";
  manualDigitEl.focus();
  submitTranscript(value);
}

listenButtonEl.addEventListener("click", toggleListening);
resetButtonEl.addEventListener("click", resetProgress);
manualSubmitEl.addEventListener("click", submitManualDigits);
manualDigitEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    submitManualDigits();
  }
});
recordSyncButtonEl?.addEventListener("click", () => {
  if (!signedInUsername) {
    window.siteAuth?.openSignIn();
    return;
  }

  setRecordSyncStatus(`Records save automatically to ${signedInUsername}.`);
});
window.addEventListener("site-auth-change", handleAuthChange);

renderPersonalBest();
useAnonymousRecord();
updateScoreboard();
updateListenButton();
initRecognition();

window.piVoiceAppTestApi = {
  extractDigits,
  submitTranscript,
  resetProgress,
  getState: () => ({
    correctCount,
    bestCorrectCount,
    wrongCount,
    expectedDigit: getExpectedDigit(),
    lastSpokenDigit: spokenDigitEl.textContent,
    correctSequence: correctSequenceEl.textContent,
    status: statusTextEl.textContent,
    totalPiDigits: PI_DIGITS.length,
    listening,
    isMobile
  })
};

window.gameScoreApi = {
  getScoreSnapshot: () => ({
    correctCount,
    bestCorrectCount,
    wrongCount,
    nextPosition: correctCount + 1,
    correctSequence: PI_DIGITS.slice(0, correctCount),
    listening,
    updatedAt: new Date().toISOString()
  })
};



