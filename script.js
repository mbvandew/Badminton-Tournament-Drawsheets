// ===== CONFIG =====
const SHEET_ID = "1Uf1cCysPOg96FVqSgDx1B1mQ3NDGurEj0v1krBHO8E8";
const ROTATION_SECONDS = 20;

const DIVISIONS = [
  { name: "Girls Singles", gid: "298838762", onDeckIndex: 0 },
  { name: "Boys Singles", gid: "211611692", onDeckIndex: 1 },
  { name: "Girls Doubles", gid: "1301111932", onDeckIndex: 2 },
  { name: "Boys Doubles", gid: "1504813348", onDeckIndex: 3 },
  { name: "Mixed Doubles", gid: "943827802", onDeckIndex: 4 }
];

// Board!G2:G6 → 5 rows
const ON_DECK_GVIZ_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?` +
  new URLSearchParams({
    sheet: "Board",
    range: "G2:G6",
    tqx: "out:json"
  }).toString();

// ===== UTIL =====
function buildSheetEmbedUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pubhtml?` +
    `gid=${gid}&single=true&widget=true&headers=false`;
}

function parseGvizJson(text) {
  // gviz wraps JSON in "google.visualization.Query.setResponse(...)"
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// ===== CLOCK =====
function startClock() {
  const clockEl = document.getElementById("clock");
  if (!clockEl) return;

  function update() {
    const now = new Date();
    const time = now.toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    clockEl.textContent = time;
  }

  update();
  setInterval(update, 1000);
}

// ===== ON DECK =====
let onDeckValues = ["", "", "", "", ""];

async function fetchOnDeck() {
  try {
    const res = await fetch(ON_DECK_GVIZ_URL, { cache: "no-store" });
    const text = await res.text();
    const json = parseGvizJson(text);
    if (!json || !json.table || !Array.isArray(json.table.rows)) return;

    const rows = json.table.rows;
    for (let i = 0; i < 5; i++) {
      const row = rows[i];
      const cell = row && row.c && row.c[0];
      onDeckValues[i] = cell && cell.v ? String(cell.v) : "";
    }
  } catch (e) {
    // Silent fail; keep old values
  }
  renderOnDeck();
}

function renderOnDeck() {
  const container = document.getElementById("on-deck-list");
  if (!container) return;

  container.innerHTML = "";

  DIVISIONS.forEach((div, idx) => {
    const value = onDeckValues[div.onDeckIndex] || "";
    const item = document.createElement("div");
    item.className = "on-deck-item";

    const labelRow = document.createElement("div");
    labelRow.className = "on-deck-label-row";

    const divisionEl = document.createElement("div");
    divisionEl.className = "on-deck-division";
    divisionEl.textContent = div.name;

    const tagEl = document.createElement("div");
    tagEl.className = "on-deck-tag";
    tagEl.textContent = "On Deck";

    labelRow.appendChild(divisionEl);
    labelRow.appendChild(tagEl);

    const valueEl = document.createElement("div");
    valueEl.className = "on-deck-value";

    if (value.trim() === "") {
      valueEl.classList.add("on-deck-empty");
      valueEl.textContent = "No match currently on deck";
    } else {
      valueEl.textContent = value;
    }

    item.appendChild(labelRow);
    item.appendChild(valueEl);
    container.appendChild(item);
  });
}

// ===== ROTATION =====
let currentIndex = 0;
let rotationTimer = null;

function showDivision(index) {
  const iframe = document.getElementById("sheet-frame");
  const label = document.getElementById("current-division-label");
  if (!iframe || !label) return;

  const div = DIVISIONS[index];
  iframe.src = buildSheetEmbedUrl(div.gid);
  label.textContent = `Showing: ${div.name}`;
}

function startRotation() {
  const label = document.getElementById("rotation-seconds-label");
  if (label) {
    label.textContent = String(ROTATION_SECONDS);
  }

  showDivision(currentIndex);

  if (rotationTimer) clearInterval(rotationTimer);
  rotationTimer = setInterval(() => {
    currentIndex = (currentIndex + 1) % DIVISIONS.length;
    showDivision(currentIndex);
  }, ROTATION_SECONDS * 1000);
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  startClock();
  startRotation();
  fetchOnDeck();
  // Refresh On Deck every 30 seconds
  setInterval(fetchOnDeck, 30000);
});
