const inputEl = document.getElementById("number-info-input");
const comparisonInputEl = document.getElementById("number-info-comparison-input");
const checkButtonEl = document.getElementById("number-info-check-button");
const currentNumberEl = document.getElementById("number-info-current");
const typeEl = document.getElementById("number-info-type");
const parityEl = document.getElementById("number-info-parity");
const factorCountEl = document.getElementById("number-info-factor-count");
const primeFactorsEl = document.getElementById("number-info-prime-factors");
const gcfLabelEl = document.getElementById("number-info-gcf-label");
const gcfEl = document.getElementById("number-info-gcf");
const lcmLabelEl = document.getElementById("number-info-lcm-label");
const lcmEl = document.getElementById("number-info-lcm");
const factorsEl = document.getElementById("number-info-factors");
const factorPairsEl = document.getElementById("number-info-factor-pairs");
const extraEl = document.getElementById("number-info-extra");
const signalEl = document.getElementById("number-info-signal-light");
const statusEl = document.getElementById("number-info-status-text");

function setSignal(state) {
  signalEl.classList.remove("signal-idle", "signal-success", "signal-error");
  signalEl.classList.add(`signal-${state}`);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function formatInteger(value) {
  return value.toLocaleString("en-US");
}

function getValidatedInput(input, label) {
  const rawValue = input.value.trim();
  const value = Number(rawValue);

  if (!rawValue) {
    throw new Error(`Please enter ${label}.`);
  }

  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error("Please enter a whole number with no decimals.");
  }

  if (value < 0) {
    throw new Error("Please enter 0 or a positive whole number.");
  }

  if (value > 10000000) {
    throw new Error("Keep the number at 10,000,000 or lower so the tool stays fast.");
  }

  return value;
}

function getGreatestCommonFactor(left, right) {
  let first = Math.abs(left);
  let second = Math.abs(right);

  while (second !== 0) {
    const remainder = first % second;
    first = second;
    second = remainder;
  }

  return first;
}

function getLeastCommonMultiple(left, right, greatestCommonFactor = getGreatestCommonFactor(left, right)) {
  if (left === 0 || right === 0) {
    return 0;
  }

  return Math.abs((left / greatestCommonFactor) * right);
}

function isPrime(value) {
  if (value < 2) {
    return false;
  }

  if (value === 2) {
    return true;
  }

  if (value % 2 === 0) {
    return false;
  }

  const limit = Math.floor(Math.sqrt(value));
  for (let factor = 3; factor <= limit; factor += 2) {
    if (value % factor === 0) {
      return false;
    }
  }

  return true;
}

function getFactors(value) {
  if (value === 0) {
    return [];
  }

  const lower = [];
  const upper = [];
  const limit = Math.floor(Math.sqrt(value));

  for (let factor = 1; factor <= limit; factor += 1) {
    if (value % factor !== 0) {
      continue;
    }

    lower.push(factor);
    const partner = value / factor;
    if (partner !== factor) {
      upper.unshift(partner);
    }
  }

  return lower.concat(upper);
}

function getFactorPairs(value) {
  if (value === 0) {
    return [];
  }

  const pairs = [];
  const limit = Math.floor(Math.sqrt(value));

  for (let factor = 1; factor <= limit; factor += 1) {
    if (value % factor === 0) {
      pairs.push([factor, value / factor]);
    }
  }

  return pairs;
}

function getPrimeFactorization(value) {
  if (value < 2) {
    return [];
  }

  const factors = [];
  let remaining = value;
  let divisor = 2;

  while (divisor * divisor <= remaining) {
    let exponent = 0;
    while (remaining % divisor === 0) {
      remaining /= divisor;
      exponent += 1;
    }

    if (exponent > 0) {
      factors.push({ base: divisor, exponent });
    }

    divisor = divisor === 2 ? 3 : divisor + 2;
  }

  if (remaining > 1) {
    factors.push({ base: remaining, exponent: 1 });
  }

  return factors;
}

function getDigitSum(value) {
  return String(value)
    .split("")
    .reduce((sum, digit) => sum + Number(digit), 0);
}

function describeType(value, prime) {
  if (value === 0) {
    return "Zero";
  }

  if (value === 1) {
    return "Neither";
  }

  return prime ? "Prime" : "Composite";
}

function renderNumberInfo(value, comparisonValue) {
  const prime = isPrime(value);
  const factors = getFactors(value);
  const factorPairs = getFactorPairs(value);
  const primeFactorization = getPrimeFactorization(value);
  const digitSum = getDigitSum(value);
  const square = value * value;
  const cube = square * value;
  const greatestCommonFactor = getGreatestCommonFactor(value, comparisonValue);
  const leastCommonMultiple = getLeastCommonMultiple(value, comparisonValue, greatestCommonFactor);

  currentNumberEl.textContent = formatInteger(value);
  typeEl.textContent = describeType(value, prime);
  parityEl.textContent = value % 2 === 0 ? "Even" : "Odd";
  factorCountEl.textContent = value === 0 ? "Infinite" : formatInteger(factors.length);
  gcfLabelEl.textContent = `GCF with ${formatInteger(comparisonValue)}`;
  lcmLabelEl.textContent = `LCM with ${formatInteger(comparisonValue)}`;
  gcfEl.textContent = value === 0 && comparisonValue === 0
    ? "Undefined"
    : formatInteger(greatestCommonFactor);
  lcmEl.textContent = formatInteger(leastCommonMultiple);

  if (primeFactorization.length) {
    primeFactorsEl.textContent = primeFactorization
      .map((item) => item.exponent === 1 ? formatInteger(item.base) : `${formatInteger(item.base)}^${item.exponent}`)
      .join(" x ");
  } else {
    primeFactorsEl.textContent = value < 2 ? "None" : formatInteger(value);
  }

  factorsEl.textContent = value === 0
    ? "Every non-zero whole number divides 0."
    : factors.map((factor) => formatInteger(factor)).join(", ");

  factorPairsEl.textContent = value === 0
    ? "Factor pairs do not work the usual way for 0."
    : factorPairs.map(([left, right]) => `${formatInteger(left)} x ${formatInteger(right)}`).join(", ");

  extraEl.textContent = [
    `Digit sum: ${formatInteger(digitSum)}`,
    `Square: ${formatInteger(square)}`,
    `Cube: ${formatInteger(cube)}`
  ].join(". ") + ".";

  const comparisonSummary = value === 0 && comparisonValue === 0
    ? "The GCF of 0 and 0 is undefined, and their LCM is 0."
    : `Their GCF is ${formatInteger(greatestCommonFactor)}, and their LCM is ${formatInteger(leastCommonMultiple)}.`;

  setSignal(prime ? "success" : "idle");
  if (value === 0) {
    setStatus(`0 is even and special. It is not prime or composite. ${comparisonSummary}`);
  } else if (value === 1) {
    setStatus(`1 is a special case. It is neither prime nor composite. ${comparisonSummary}`);
  } else if (prime) {
    setStatus(`${formatInteger(value)} is prime, so it only has 2 factors. ${comparisonSummary}`);
  } else {
    setStatus(`${formatInteger(value)} is composite and has ${formatInteger(factors.length)} factors. ${comparisonSummary}`);
  }
}

function updateNumberInfo() {
  try {
    const value = getValidatedInput(inputEl, "a number to analyze");
    const comparisonValue = getValidatedInput(comparisonInputEl, "a comparison number");
    renderNumberInfo(value, comparisonValue);
  } catch (error) {
    setSignal("error");
    setStatus(error.message);
  }
}

checkButtonEl.addEventListener("click", updateNumberInfo);
inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    updateNumberInfo();
  }
});
comparisonInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    updateNumberInfo();
  }
});

updateNumberInfo();

window.numberInfoTestApi = {
  getGreatestCommonFactor,
  getLeastCommonMultiple
};
