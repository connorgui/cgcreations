const PI_DIGITS = "314159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196";

const DIGIT_WORDS = {
  zero: "0",
  oh: "0",
  o: "0",
  owe: "0",
  one: "1",
  won: "1",
  two: "2",
  to: "2",
  too: "2",
  three: "3",
  tree: "3",
  free: "3",
  see: "3",
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
let mobileSingleDigitTimeoutId = null;
let bestTranscriptCandidate = "";
let bestTranscriptDigitCount = 0;
let bestTranscriptConfidence = -1;
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

function clearMobileSingleDigitTimeout() {
  if (mobileSingleDigitTimeoutId !== null) {
    window.clearTimeout(mobileSingleDigitTimeoutId);
    mobileSingleDigitTimeoutId = null;
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
  correctSequenceEl.textContent = formatPiDigits(PI_DIGITS.slice(0, correctCount));
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

function rememberTranscriptCandidate(transcript, confidence = -1) {
  const normalizedTranscript = normalizeTranscript(transcript);
  const digitCount = extractDigits(normalizedTranscript).length;
  if (!digitCount) {
    return;
  }

  if (
    digitCount > bestTranscriptDigitCount ||
    (
      digitCount === bestTranscriptDigitCount &&
      (
        confidence > bestTranscriptConfidence ||
        (
          confidence === bestTranscriptConfidence &&
          normalizedTranscript.length > bestTranscriptCandidate.length
        )
      )
    )
  ) {
    bestTranscriptCandidate = normalizedTranscript;
    bestTranscriptDigitCount = digitCount;
    bestTranscriptConfidence = confidence;
  }
}

function clearTranscriptCandidate() {
  bestTranscriptCandidate = "";
  bestTranscriptDigitCount = 0;
  bestTranscriptConfidence = -1;
}

function processSingleDigitCandidateSoon() {
  if (!isMobile || heardFinalResultThisSession || bestTranscriptDigitCount !== 1 || !bestTranscriptCandidate) {
    return;
  }

  clearMobileSingleDigitTimeout();
  mobileSingleDigitTimeoutId = window.setTimeout(() => {
    mobileSingleDigitTimeoutId = null;

    if (!listening || heardFinalResultThisSession || bestTranscriptDigitCount !== 1 || !bestTranscriptCandidate) {
      return;
    }

    const processed = submitTranscript(bestTranscriptCandidate, { ignoreUnrecognized: true });
    if (processed && !processed.ignored) {
      heardFinalResultThisSession = true;
      clearTranscriptCandidate();
    }
  }, 325);
}

function pickBestTranscriptFromResult(result) {
  let bestOption = null;

  for (let alternativeIndex = 0; alternativeIndex < result.length; alternativeIndex += 1) {
    const alternative = result[alternativeIndex];
    const transcript = normalizeTranscript(alternative?.transcript ?? "");
    const digitCount = extractDigits(transcript).length;
    const confidence = typeof alternative?.confidence === "number" ? alternative.confidence : -1;

    if (!transcript) {
      continue;
    }

    if (
      !bestOption ||
      digitCount > bestOption.digitCount ||
      (
        digitCount === bestOption.digitCount &&
        (
          confidence > bestOption.confidence ||
          (
            confidence === bestOption.confidence &&
            transcript.length > bestOption.transcript.length
          )
        )
      )
    ) {
      bestOption = { transcript, digitCount, confidence };
    }
  }

  return bestOption;
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
  clearTranscriptCandidate();
  return Boolean(result && !result.ignored);
}

function startListening() {
  if (!recognition || listening) {
    return;
  }

  clearRestartTimeout();
  clearMobileSingleDigitTimeout();
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
  clearMobileSingleDigitTimeout();
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
  recognition.maxAlternatives = 5;

  supportTextEl.textContent =
    "Works best in Chrome or Edge with microphone access enabled. The app checks the strongest transcript it hears, including alternate speech matches, to reduce missed digits.";

  recognition.onstart = () => {
    listening = true;
    heardFinalResultThisSession = false;
    clearMobileSingleDigitTimeout();
    clearTranscriptCandidate();
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
      clearMobileSingleDigitTimeout();
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
      const primaryTranscript = getPrimaryTranscript(result);
      const bestOption = pickBestTranscriptFromResult(result);
      const transcript = bestOption?.transcript || primaryTranscript;

      if (transcript && (!isMobile || !heardFinalResultThisSession)) {
        rememberTranscriptCandidate(transcript, bestOption?.confidence ?? -1);
        previewTranscript(transcript);
        if (isMobile && !result.isFinal) {
          if (bestTranscriptDigitCount === 1) {
            processSingleDigitCandidateSoon();
          } else {
            clearMobileSingleDigitTimeout();
          }
        }
      }

      if (!result.isFinal) {
        continue;
      }

      clearMobileSingleDigitTimeout();

      if (isMobile && heardFinalResultThisSession) {
        continue;
      }

      const finalTranscript = transcript || primaryTranscript;
      const processed = submitTranscript(finalTranscript, { ignoreUnrecognized: true });
      if (processed && !processed.ignored) {
        heardFinalResultThisSession = true;
        clearTranscriptCandidate();
      } else if (finalTranscript) {
        previewTranscript(finalTranscript);
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

window.gameScoreApi = {
  getScoreSnapshot: () => ({
    correctCount,
    wrongCount,
    nextPosition: correctCount + 1,
    correctSequence: PI_DIGITS.slice(0, correctCount),
    listening,
    updatedAt: new Date().toISOString()
  })
};



