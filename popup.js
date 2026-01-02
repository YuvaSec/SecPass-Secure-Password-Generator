const defaults = {
  length: 16,
  lower: true,
  upper: true,
  nums: true,
  syms: true,
  sanskrit: false,
  noSimilar: false,
};

const elements = {
  length: document.getElementById("length"),
  lengthValue: document.getElementById("lengthValue"),
  lower: document.getElementById("lower"),
  upper: document.getElementById("upper"),
  nums: document.getElementById("nums"),
  syms: document.getElementById("syms"),
  sanskrit: document.getElementById("sanskrit"),
  noSimilar: document.getElementById("noSimilar"),
  result: document.getElementById("result"),
  resultDisplay: document.getElementById("resultDisplay"),
  copy: document.getElementById("copy"),
  generate: document.getElementById("generate"),
  regenerate: document.getElementById("regenerate"),
  strengthBar: document.querySelector(".strength-bar span"),
  strengthWrap: document.querySelector(".strength-bar"),
  strengthLabel: document.getElementById("strengthLabel"),
  toast: document.getElementById("toast"),
};

const similarChars = new Set(["I", "l", "1", "O", "0"]);
const sets = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  nums: "0123456789",
  syms: "!@#$%^&*()-_=+[]{};:,.<>/?~",
  sanskrit: "अआइईउऊएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह",
};

let toastTimeout;
let copyTimeout;
let scrambleTimer;
let lastStandardToggles = null;
let currentPassword = "";

function secureRandomInt(max) {
  if (max <= 0) {
    throw new Error("Invalid max");
  }
  const range = 0x100000000;
  const limit = Math.floor(range / max) * max;
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function pickChar(source) {
  return source[secureRandomInt(source.length)];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function filteredSet(value, excludeSimilar) {
  if (!excludeSimilar) {
    return value;
  }
  return [...value].filter((char) => !similarChars.has(char)).join("");
}

function buildPool(options) {
  if (options.sanskrit) {
    const latinLower = filteredSet(sets.lower, options.noSimilar);
    const latinUpper = filteredSet(sets.upper, options.noSimilar);
    const latinNums = filteredSet(sets.nums, options.noSimilar);
    const activeSets = [sets.sanskrit, latinLower, latinUpper, latinNums].filter(Boolean);
    const pool = activeSets.join("");
    return { pool, activeSets };
  }

  const activeSets = [];
  if (options.lower) activeSets.push(filteredSet(sets.lower, options.noSimilar));
  if (options.upper) activeSets.push(filteredSet(sets.upper, options.noSimilar));
  if (options.nums) activeSets.push(filteredSet(sets.nums, options.noSimilar));
  if (options.syms) activeSets.push(filteredSet(sets.syms, options.noSimilar));
  if (options.sanskrit) activeSets.push(sets.sanskrit);

  const pool = activeSets.join("");
  return { pool, activeSets };
}

function entropyFor(length, poolSize) {
  if (!poolSize || !length) return 0;
  return length * Math.log2(poolSize);
}

function strengthLabel(entropy) {
  if (entropy < 35) return "Weak";
  if (entropy < 60) return "Okay";
  if (entropy < 80) return "Strong";
  return "Very strong";
}

function showToast(message, type = "") {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.className = `toast show ${type}`.trim();
  toastTimeout = setTimeout(() => {
    elements.toast.className = "toast";
  }, 2000);
}

function updateStrength(length, poolSize) {
  const entropy = entropyFor(length, poolSize);
  elements.strengthLabel.textContent = strengthLabel(entropy);
  const width = Math.min(100, Math.round(entropy));
  elements.strengthBar.style.width = `${width}%`;
  elements.strengthWrap.setAttribute("aria-valuenow", String(width));
}

function readOptionsFromUI() {
  return {
    length: Number(elements.length.value),
    lower: elements.lower.checked,
    upper: elements.upper.checked,
    nums: elements.nums.checked,
    syms: elements.syms.checked,
    sanskrit: elements.sanskrit.checked,
    noSimilar: elements.noSimilar.checked,
  };
}

function writeOptionsToUI(options) {
  elements.length.value = options.length;
  elements.lengthValue.textContent = options.length;
  elements.lower.checked = options.lower;
  elements.upper.checked = options.upper;
  elements.nums.checked = options.nums;
  elements.syms.checked = options.syms;
  elements.sanskrit.checked = options.sanskrit;
  elements.noSimilar.checked = options.noSimilar;
  syncSanskritModeUI(options.sanskrit);
}

function saveOptions(options) {
  chrome.storage.sync.set(options);
}

function syncSanskritModeUI(enabled) {
  const shouldDisable = Boolean(enabled);
  elements.lower.disabled = shouldDisable;
  elements.upper.disabled = shouldDisable;
  elements.nums.disabled = shouldDisable;
  elements.syms.disabled = shouldDisable;
}

function generatePassword(options) {
  const { pool, activeSets } = buildPool(options);
  if (!activeSets.length) {
    showToast("Select at least one character set", "error");
    elements.result.value = "";
    renderResult("");
    currentPassword = "";
    updateStrength(0, 0);
    return;
  }
  if (!pool.length) {
    showToast("No characters available after filtering", "error");
    elements.result.value = "";
    renderResult("");
    currentPassword = "";
    updateStrength(0, 0);
    return;
  }

  const result = [];
  for (const set of activeSets) {
    if (!set.length) continue;
    result.push(pickChar(set));
  }

  while (result.length < options.length) {
    result.push(pickChar(pool));
  }

  shuffle(result);
  const password = result.join("");
  currentPassword = password;
  updateStrength(options.length, pool.length);
  animatePassword(password, pool);
}

function handleOptionChange() {
  let options = readOptionsFromUI();
  if (options.sanskrit) {
    if (!lastStandardToggles) {
      lastStandardToggles = {
        lower: options.lower,
        upper: options.upper,
        nums: options.nums,
        syms: options.syms,
      };
    }
    options = {
      ...options,
      lower: true,
      upper: true,
      nums: true,
      syms: false,
    };
    writeOptionsToUI(options);
  } else {
    if (lastStandardToggles) {
      options = {
        ...options,
        ...lastStandardToggles,
      };
      lastStandardToggles = null;
      writeOptionsToUI(options);
    } else {
      syncSanskritModeUI(false);
    }
  }
  elements.lengthValue.textContent = options.length;
  saveOptions(options);
  generatePassword(options);
}

function handleCopy() {
  const value = currentPassword || elements.result.value;
  if (!value) {
    showToast("Nothing to copy", "error");
    return;
  }
  const setCopiedState = () => {
    clearTimeout(copyTimeout);
    elements.copy.classList.add("is-copied");
    elements.copy.querySelector(".copy-text").textContent = "Copied !";
    copyTimeout = setTimeout(() => {
      elements.copy.classList.remove("is-copied");
      elements.copy.querySelector(".copy-text").textContent = "Copy";
    }, 400);
  };
  navigator.clipboard.writeText(value).then(setCopiedState, setCopiedState);
}

function animatePassword(target, pool) {
  clearInterval(scrambleTimer);
  if (!pool.length) {
    elements.result.value = target;
    renderResult(target);
    return;
  }

  const chars = target.split("");
  let revealCount = 0;
  let frame = 0;
  const revealEvery = 2;

  scrambleTimer = setInterval(() => {
    frame += 1;
    if (frame % revealEvery === 0 && revealCount < chars.length) {
      revealCount += 1;
    }

    const output = chars.map((char, index) => {
      if (index < revealCount) return char;
      return pool[secureRandomInt(pool.length)];
    });

    const displayValue = output.join("");
    elements.result.value = displayValue;
    renderResult(displayValue);

    if (revealCount >= chars.length) {
      clearInterval(scrambleTimer);
      elements.result.value = target;
      renderResult(target);
    }
  }, 20);
}

function renderResult(value) {
  if (!elements.resultDisplay) return;
  elements.resultDisplay.textContent = "";
  for (const char of value) {
    const span = document.createElement("span");
    span.className = "result-char";
    if (isDevanagari(char)) {
      span.classList.add("sanskrit");
    } else if (sets.syms.includes(char)) {
      span.classList.add("symbol");
    }
    span.textContent = char;
    elements.resultDisplay.appendChild(span);
  }
}

function isDevanagari(char) {
  const code = char.charCodeAt(0);
  return code >= 0x0900 && code <= 0x097f;
}

function init() {
  chrome.storage.sync.get(defaults, (options) => {
    const resolved = { ...defaults, ...options };
    writeOptionsToUI(resolved);
    generatePassword(resolved);
  });

  elements.length.addEventListener("input", handleOptionChange);
  elements.lower.addEventListener("change", handleOptionChange);
  elements.upper.addEventListener("change", handleOptionChange);
  elements.nums.addEventListener("change", handleOptionChange);
  elements.syms.addEventListener("change", handleOptionChange);
  elements.sanskrit.addEventListener("change", handleOptionChange);
  elements.noSimilar.addEventListener("change", handleOptionChange);
  elements.generate.addEventListener("click", () => generatePassword(readOptionsFromUI()));
  elements.copy.addEventListener("click", handleCopy);
}

document.addEventListener("DOMContentLoaded", init);
