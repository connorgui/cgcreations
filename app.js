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
let correctCount = 0;
let wrongCount = 0;
let heardFinalResultThisSession = false;

function withMobileContinue(message) {
  return message;
}

function clearRestartTimeout() {
  if (restartTimeoutId !== null) {
    window.clearTimeout(restartTimeoutId);
    restartTimeoutId = null;
  }
}

function updateListenButton() {
  if (listening) {
    listenButtonEl.textContent = "Stop Listening";
    return;
  }

  listenButtonEl.textContent = "Start Listening";
}

function setSignal(state) {
  signalLightEl.classList.remove("signal-idle", "signal-success", "signal-error");
  signalLightEl.classList.add(`signal-${state}`);
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
  setSignal("idle");
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
    setSignal("error");
    setStatus(withMobileContinue(`Incorrect at ${incorrectDigit}. Expected ${expectedDigit}. Accepted ${Math.max(consumedDigits.length - 1, 0)} digit(s) from that phrase.`));
    return {
      ok: false,
      consumedDigits,
      incorrectDigit,
      expectedDigit,
      correctCount,
      wrongCount
    };
  }

  if (correctCount === PI_DIGITS.length) {
    shouldResume = false;
    setSignal("success");
    setStatus(withMobileContinue("Complete. You matched all available Pi digits in this demo."));
    if (recognition && listening) {
      recognition.stop();
    }
    return { ok: true, consumedDigits, incorrectDigit: null, expectedDigit: null, correctCount, wrongCount };
  }

  setSignal("success");
  setStatus(withMobileContinue(`Correct. Accepted ${consumedDigits.length} digit(s): ${consumedDigits.join(" ")}.`));
  return {
    ok: true,
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
      setSignal("idle");
      setStatus("Listening for digits. Say numbers like 3 1 4 or 314.");
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
    setSignal("error");
    incrementWrongCount();
    setStatus(`Heard "${transcript.trim() || "nothing"}". Please say one or more digits.`);
    return { ok: false, ignored: false, consumedDigits: [], incorrectDigit: null, expectedDigit: getExpectedDigit(), correctCount, wrongCount };
  }

  return applyDigits(digits);
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
    setSignal("idle");
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
    setStatus("Speech recognition unsupported in this browser. Use the manual test controls below.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  supportTextEl.textContent =
    "Works best in Chrome or Edge with microphone access enabled. On some phones the browser may end a session after each phrase, and this page will automatically restart listening while Start Listening remains on.";

  recognition.onstart = () => {
    listening = true;
    heardFinalResultThisSession = false;
    updateListenButton();
    setSignal("idle");
    setStatus("Listening for your next digit or group of digits.");
  };

  recognition.onend = () => {
    listening = false;
    updateListenButton();

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

    if (manualStopRequested) {
      manualStopRequested = false;
      setStatus("Listening stopped.");
      setSignal("idle");
      return;
    }

    if (!heardFinalResultThisSession) {
      setStatus("Listening ended before any digits were recognized.");
      setSignal("idle");
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      shouldResume = false;
      manualStopRequested = false;
      setStatus("Microphone access was denied. Enable it in the browser and try again.");
      setSignal("error");
      return;
    }

    if (event.error === "aborted") {
      if (manualStopRequested) {
        return;
      }

      setStatus("Listening was interrupted. Restarting if possible.");
      setSignal("idle");
      return;
    }

    if (event.error === "no-speech") {
      setStatus("No digits detected yet. Waiting for another attempt.");
      setSignal("idle");
      return;
    }

    setStatus(`Speech recognition error: ${event.error}.`);
    setSignal("error");
  };

  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (!result.isFinal) {
        continue;
      }

      const transcript = result[0]?.transcript ?? "";
      heardFinalResultThisSession = true;
      submitTranscript(transcript, { ignoreUnrecognized: true });
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
