const defaults = {
  length: 16,
  lower: true,
  upper: true,
  nums: true,
  syms: true,
  noSimilar: false,
};

const elements = {
  length: document.getElementById("length"),
  lengthValue: document.getElementById("lengthValue"),
  lower: document.getElementById("lower"),
  upper: document.getElementById("upper"),
  nums: document.getElementById("nums"),
  syms: document.getElementById("syms"),
  noSimilar: document.getElementById("noSimilar"),
  result: document.getElementById("result"),
  copy: document.getElementById("copy"),
  generate: document.getElementById("generate"),
  regenerate: document.getElementById("regenerate"),
  shuffle: document.getElementById("shuffle"),
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
};

let toastTimeout;
let copyTimeout;

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
  const activeSets = [];
  if (options.lower) activeSets.push(filteredSet(sets.lower, options.noSimilar));
  if (options.upper) activeSets.push(filteredSet(sets.upper, options.noSimilar));
  if (options.nums) activeSets.push(filteredSet(sets.nums, options.noSimilar));
  if (options.syms) activeSets.push(filteredSet(sets.syms, options.noSimilar));

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
  elements.noSimilar.checked = options.noSimilar;
}

function saveOptions(options) {
  chrome.storage.sync.set(options);
}

function generatePassword(options) {
  const { pool, activeSets } = buildPool(options);
  if (!activeSets.length) {
    showToast("Select at least one character set", "error");
    elements.result.value = "";
    updateStrength(0, 0);
    return;
  }
  if (!pool.length) {
    showToast("No characters available after filtering", "error");
    elements.result.value = "";
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
  elements.result.value = password;
  updateStrength(options.length, pool.length);
}

function handleOptionChange() {
  const options = readOptionsFromUI();
  elements.lengthValue.textContent = options.length;
  saveOptions(options);
  generatePassword(options);
}

function handleCopy() {
  const value = elements.result.value;
  if (!value) {
    showToast("Nothing to copy", "error");
    return;
  }
  const setCopiedState = () => {
    clearTimeout(copyTimeout);
    elements.copy.classList.add("is-copied");
    elements.copy.querySelector(".copy-text").textContent = "Copied";
    copyTimeout = setTimeout(() => {
      elements.copy.classList.remove("is-copied");
      elements.copy.querySelector(".copy-text").textContent = "Copy";
    }, 1900);
  };
  navigator.clipboard.writeText(value).then(setCopiedState, setCopiedState);
}

function handleShuffle() {
  const value = elements.result.value;
  if (!value) {
    showToast("Nothing to shuffle", "error");
    return;
  }
  const chars = shuffle([...value]);
  elements.result.value = chars.join("");
  const options = readOptionsFromUI();
  const { pool } = buildPool(options);
  updateStrength(chars.length, pool.length);
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
  elements.noSimilar.addEventListener("change", handleOptionChange);
  elements.generate.addEventListener("click", () => generatePassword(readOptionsFromUI()));
  elements.shuffle.addEventListener("click", handleShuffle);
  elements.copy.addEventListener("click", handleCopy);
}

document.addEventListener("DOMContentLoaded", init);
