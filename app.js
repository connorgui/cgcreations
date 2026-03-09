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
  tree: "3",
  four: "4",
  for: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  ate: "8",
  nine: "9"
};

const correctCountEl = document.getElementById("correct-count");
const wrongCountEl = document.getElementById("wrong-count");
const nextPositionEl = document.getElementById("next-position");
const signalLightEl = document.getElementById("signal-light");
const statusTextEl = document.getElementById("status-text");
const spokenDigitEl = document.getElementById("spoken-digit");
const correctSequenceEl = document.getElementById("correct-sequence");
const listenButtonEl = document.getElementById("listen-button");
const resetButtonEl = document.getElementById("reset-button");
const supportTextEl = document.getElementById("support-text");
const manualDigitEl = document.getElementById("manual-digit");
const manualSubmitEl = document.getElementById("manual-submit");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

let recognition = null;
let listening = false;
let shouldResume = false;
let manualStopRequested = false;
let restartTimeoutId = null;
let bestTranscriptCandidate = "";
let bestTranscriptDigitCount = 0;
let correctCount = 0;
let wrongCount = 0;
let heardFinalResultThisSession = false;
let hasResultToDisplay = false;

function clearRestartTimeout() {
  if (restartTimeoutId !== null) {
    window.clearTimeout(restartTimeoutId);
    restartTimeoutId = null;
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
  correctSequenceEl.textContent = formatPiDigits(PI_DIGITS.slice(0, correctCount));
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

function extractDigits(transcript) {
  const cleaned = transcript.toLowerCase().trim();

  if (!cleaned) {
    return [];
  }

  const tokens = cleaned.match(/[a-z]+|\d+/g) ?? [];
  const digits = [];

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      digits.push(...token.split(""));
      continue;
    }

    if (DIGIT_WORDS[token]) {
      digits.push(DIGIT_WORDS[token]);
    }
  }

  return digits;
}

function rememberTranscriptCandidate(transcript) {
  const normalizedTranscript = transcript.trim();
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
    setStatus(`Incorrect at ${incorrectDigit}. Expected ${expectedDigit}. Accepted ${Math.max(consumedDigits.length - 1, 0)} digit(s) from that phrase.`);
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
  if (!bestTranscriptCandidate) {
    return false;
  }

  const result = submitTranscript(bestTranscriptCandidate, { ignoreUnrecognized: true });
  bestTranscriptCandidate = "";
  bestTranscriptDigitCount = 0;
  return Boolean(result && !result.ignored);
}

function startListening() {
  if (!recognition || listening) {
    return;
  }

  clearRestartTimeout();
  manualStopRequested = false;
  shouldResume = true;
  try {
    recognition.start();
  } catch (error) {
    shouldResume = false;
    hasResultToDisplay = true;
    setSignal("error");
    setStatus(`Could not start speech recognition: ${error.message}.`);
  }
}

function stopListening() {
  if (!recognition) {
    return;
  }

  clearRestartTimeout();
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
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  supportTextEl.textContent =
    "Works best in Chrome or Edge with microphone access enabled. On phones, the app waits for each short speaking burst to finish, then checks the best digits it heard.";

  recognition.onstart = () => {
    listening = true;
    heardFinalResultThisSession = false;
    bestTranscriptCandidate = "";
    bestTranscriptDigitCount = 0;
    updateListenButton();
    if (!hasResultToDisplay) {
      setSignal("idle");
    }
    if (!hasResultToDisplay) {
      setStatus("Listening for your next digit or group of digits.");
    }
  };

  recognition.onend = () => {
    listening = false;
    updateListenButton();

    if (manualStopRequested) {
      manualStopRequested = false;
      bestTranscriptCandidate = "";
      bestTranscriptDigitCount = 0;
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
      }, 150);
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

      setStatus("Listening was interrupted. Restarting if possible.");
      if (!hasResultToDisplay) {
        setSignal("idle");
      }
      return;
    }

    if (event.error === "no-speech") {
      setStatus("No digits detected yet. Waiting for another attempt.");
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
      const transcript = (result[0]?.transcript ?? "").trim();

      if (transcript && (!isMobile || !heardFinalResultThisSession)) {
        rememberTranscriptCandidate(transcript);
      }

      if (!result.isFinal) {
        continue;
      }

      if (isMobile && heardFinalResultThisSession) {
        continue;
      }

      const processed = submitTranscript(transcript, { ignoreUnrecognized: true });
      if (processed && !processed.ignored) {
        heardFinalResultThisSession = true;
        bestTranscriptCandidate = "";
        bestTranscriptDigitCount = 0;
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

updateScoreboard();
updateListenButton();
initRecognition();

window.piVoiceAppTestApi = {
  extractDigits,
  submitTranscript,
  resetProgress,
  getState: () => ({
    correctCount,
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



