// Démineur — HTML/CSS/JavaScript, sans dépendance
"use strict";

const LEVELS = {
  debutant:      { rows: 9,  cols: 9,  mines: 10, label: "Débutant" },
  intermediaire: { rows: 16, cols: 16, mines: 40, label: "Intermédiaire" },
  expert:        { rows: 16, cols: 30, mines: 99, label: "Expert" },
};

const boardEl = document.getElementById("board");
const minesLeftEl = document.getElementById("mines-left");
const timerEl = document.getElementById("timer");
const resetBtn = document.getElementById("reset");
const messageEl = document.getElementById("message");
const flagModeBtn = document.getElementById("flag-mode");
const bestEl = document.getElementById("best");
const levelBtns = document.querySelectorAll("[data-level]");

let level = "debutant";
let rows, cols, mineCount;
let cells = [];
let revealedCount = 0;
let flagCount = 0;
let started = false;
let over = false;
let seconds = 0;
let timerId = null;
let flagMode = false;
let suppressClick = false;

// ---------- Mise en place ----------

function newGame() {
  const L = LEVELS[level];
  rows = L.rows;
  cols = L.cols;
  mineCount = L.mines;

  cells = [];
  boardEl.innerHTML = "";
  boardEl.style.setProperty("--cols", cols);
  boardEl.dataset.level = level;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "cell";
      if ((r + c) % 2) el.classList.add("alt");
      el.dataset.index = r * cols + c;
      el.tabIndex = r === 0 && c === 0 ? 0 : -1;
      el.setAttribute("aria-label", `Ligne ${r + 1}, colonne ${c + 1}, cachée`);
      boardEl.appendChild(el);
      cells.push({ r, c, mine: false, adj: 0, revealed: false, flagged: false, el });
    }
  }

  revealedCount = 0;
  flagCount = 0;
  started = false;
  over = false;
  stopTimer();
  seconds = 0;
  timerEl.textContent = "0";
  updateMinesLeft();
  setMessage("", "");
  resetBtn.textContent = "Nouvelle partie";
  showBest();
}

function cellAt(r, c) {
  return cells[r * cols + c];
}

function neighbors(cell) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = cell.r + dr;
      const nc = cell.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(cellAt(nr, nc));
    }
  }
  return out;
}

// Les mines sont posées au premier clic : la case cliquée et ses voisines sont toujours sûres.
function placeMines(safeCell) {
  const forbidden = new Set([safeCell, ...neighbors(safeCell)]);
  const candidates = cells.filter((cl) => !forbidden.has(cl));

  for (let i = 0; i < mineCount; i++) {
    const j = i + Math.floor(Math.random() * (candidates.length - i));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    candidates[i].mine = true;
  }

  for (const cl of cells) {
    cl.adj = neighbors(cl).filter((n) => n.mine).length;
  }
}

// ---------- Actions ----------

function primaryAction(cell) {
  if (over) return;
  if (flagMode && !cell.revealed) {
    toggleFlag(cell);
    return;
  }
  if (cell.flagged) return;

  if (!started) {
    placeMines(cell);
    started = true;
    startTimer();
  }

  if (cell.revealed) {
    chord(cell);
  } else {
    reveal(cell);
  }
  checkWin();
}

function reveal(start) {
  const stack = [start];
  while (stack.length) {
    const cell = stack.pop();
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    revealedCount++;
    render(cell);

    if (cell.mine) {
      lose(cell);
      return;
    }
    if (cell.adj === 0) {
      for (const n of neighbors(cell)) {
        if (!n.revealed && !n.flagged) stack.push(n);
      }
    }
  }
}

// Clic sur un chiffre : si le bon nombre de drapeaux l'entoure, on découvre le reste.
function chord(cell) {
  if (cell.adj === 0) return;
  const around = neighbors(cell);
  const flagged = around.filter((n) => n.flagged).length;
  if (flagged !== cell.adj) return;
  for (const n of around) {
    if (!n.revealed && !n.flagged) {
      reveal(n);
      if (over) return;
    }
  }
}

function toggleFlag(cell) {
  if (over || cell.revealed) return;
  cell.flagged = !cell.flagged;
  flagCount += cell.flagged ? 1 : -1;
  cell.el.classList.toggle("flagged", cell.flagged);
  cell.el.setAttribute(
    "aria-label",
    `Ligne ${cell.r + 1}, colonne ${cell.c + 1}, ${cell.flagged ? "drapeau" : "cachée"}`
  );
  updateMinesLeft();
}

function render(cell) {
  const el = cell.el;
  el.classList.add("revealed");
  let desc;
  if (cell.mine) {
    el.classList.add("mine");
    desc = "mine";
  } else if (cell.adj > 0) {
    el.textContent = cell.adj;
    el.dataset.n = cell.adj;
    desc = `${cell.adj} mine${cell.adj > 1 ? "s" : ""} autour`;
  } else {
    desc = "vide";
  }
  el.setAttribute("aria-label", `Ligne ${cell.r + 1}, colonne ${cell.c + 1}, ${desc}`);
}

// ---------- Fin de partie ----------

function lose(hit) {
  over = true;
  stopTimer();
  hit.el.classList.add("boom");
  for (const cl of cells) {
    if (cl.mine && !cl.flagged && cl !== hit) {
      cl.el.classList.add("revealed", "mine");
    } else if (cl.flagged && !cl.mine) {
      cl.el.classList.add("wrong");
    }
  }
  setMessage("Boum ! Partie perdue.", "lose");
  resetBtn.textContent = "Rejouer";
}

function checkWin() {
  if (over) return;
  if (revealedCount !== rows * cols - mineCount) return;

  over = true;
  stopTimer();
  for (const cl of cells) {
    if (cl.mine && !cl.flagged) {
      cl.flagged = true;
      cl.el.classList.add("flagged");
    }
  }
  flagCount = mineCount;
  updateMinesLeft();

  const best = getBest();
  let text = `Gagné en ${seconds} seconde${seconds > 1 ? "s" : ""} !`;
  if (best === null || seconds < best) {
    saveBest(seconds);
    if (best !== null) text += " Nouveau record !";
  }
  setMessage(text, "win");
  resetBtn.textContent = "Rejouer";
  showBest();
}

// ---------- Chrono, compteur, records ----------

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    if (seconds < 999) seconds++;
    timerEl.textContent = seconds;
  }, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function updateMinesLeft() {
  minesLeftEl.textContent = mineCount - flagCount;
}

function setMessage(text, kind) {
  messageEl.textContent = text;
  messageEl.className = "message" + (kind ? " " + kind : "");
}

function getBest() {
  try {
    const v = localStorage.getItem("demineur-record-" + level);
    return v === null ? null : Number(v);
  } catch (e) {
    return null;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem("demineur-record-" + level, String(value));
  } catch (e) {
    /* stockage indisponible : on ignore */
  }
}

function showBest() {
  const best = getBest();
  bestEl.textContent =
    best === null ? "" : `Record ${LEVELS[level].label.toLowerCase()} : ${best} s`;
}

// ---------- Événements ----------

function cellFromEvent(e) {
  const el = e.target.closest(".cell");
  return el ? cells[Number(el.dataset.index)] : null;
}

boardEl.addEventListener("click", (e) => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const cell = cellFromEvent(e);
  if (cell) primaryAction(cell);
});

boardEl.addEventListener("contextmenu", (e) => {
  const cell = cellFromEvent(e);
  if (!cell) return;
  e.preventDefault();
  toggleFlag(cell);
});

// Appui long sur écran tactile = drapeau
let pressTimer = null;
boardEl.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "touch") return;
  const cell = cellFromEvent(e);
  if (!cell) return;
  pressTimer = setTimeout(() => {
    toggleFlag(cell);
    suppressClick = true;
    if (navigator.vibrate) navigator.vibrate(30);
  }, 450);
});
["pointerup", "pointercancel", "pointerleave", "pointermove"].forEach((type) =>
  boardEl.addEventListener(type, (e) => {
    if (type === "pointermove" && Math.abs(e.movementX) + Math.abs(e.movementY) < 6) return;
    clearTimeout(pressTimer);
  })
);

// Clavier : flèches pour se déplacer, F pour un drapeau
boardEl.addEventListener("keydown", (e) => {
  const cell = cellFromEvent(e);
  if (!cell) return;
  const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (moves[e.key]) {
    e.preventDefault();
    const [dr, dc] = moves[e.key];
    const nr = Math.min(rows - 1, Math.max(0, cell.r + dr));
    const nc = Math.min(cols - 1, Math.max(0, cell.c + dc));
    const next = cellAt(nr, nc);
    cell.el.tabIndex = -1;
    next.el.tabIndex = 0;
    next.el.focus();
  } else if (e.key === "f" || e.key === "F") {
    e.preventDefault();
    toggleFlag(cell);
  }
});

resetBtn.addEventListener("click", newGame);

flagModeBtn.addEventListener("click", () => {
  flagMode = !flagMode;
  flagModeBtn.setAttribute("aria-pressed", String(flagMode));
});

levelBtns.forEach((btn) =>
  btn.addEventListener("click", () => {
    level = btn.dataset.level;
    levelBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    newGame();
  })
);

newGame();
