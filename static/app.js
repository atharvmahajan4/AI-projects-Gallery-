/* ResumeGenius AI frontend logic — no frameworks, just fetch + DOM. */

const ROLE_OPTIONS = [
  "Software Engineer", "SDE", "Backend Developer", "Frontend Developer",
  "Full-Stack Developer", "Data Scientist", "Data Analyst", "ML Engineer",
  "Cloud Engineer", "DevOps Engineer", "Cyber Security", "Android Developer",
  "iOS Developer", "UI/UX Designer", "QA Engineer", "Product Manager",
  "Business Analyst", "Internship (general)",
];

const HISTORY_KEY = "resumegenius_history_v1";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function populateRoleSelect() {
  const roleSelect = document.getElementById("roleSelect");
  ROLE_OPTIONS.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    roleSelect.appendChild(opt);
  });
}

// ---------------------------------------------------------------------------
// Upload / dropzone
// ---------------------------------------------------------------------------

let currentFile = null;

function setupUpload() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileChip = document.getElementById("fileChip");
  const fileChipName = document.getElementById("fileChipName");
  const removeFileBtn = document.getElementById("removeFile");
  const resumeText = document.getElementById("resumeText");

  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  removeFileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentFile = null;
    fileInput.value = "";
    fileChip.classList.remove("show");
  });

  function handleFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx"].includes(ext)) {
      showError("Only PDF or DOCX files are supported — try pasting the text below instead.");
      return;
    }
    currentFile = file;
    fileChipName.textContent = file.name;
    fileChip.classList.add("show");
    resumeText.placeholder = "Text will be pulled from your file when you click Analyze — or paste/edit it here.";
  }
}

// ---------------------------------------------------------------------------
// Analyze
// ---------------------------------------------------------------------------

function setupAnalyze() {
  document.getElementById("analyzeBtn").addEventListener("click", runAnalysis);
}

async function runAnalysis() {
  const resumeTextEl = document.getElementById("resumeText");
  const role = document.getElementById("roleSelect").value;
  const pastedText = resumeTextEl.value.trim();

  if (!currentFile && pastedText.length < 40) {
    showError("Drop a resume file or paste at least a few lines of text first.");
    return;
  }

  hideError();
  setLoading(true);

  const formData = new FormData();
  if (currentFile) formData.append("resume_file", currentFile);
  formData.append("resume_text", pastedText);
  formData.append("role", role);

  try {
    const res = await fetch("/api/analyze", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");

    const meta = { fileName: currentFile ? currentFile.name : "Pasted text", role };
    renderReport(data, meta);
    saveToHistory(data, meta.fileName);
    document.getElementById("report").hidden = false;
    document.getElementById("report").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showError(err.message || "The analysis failed — please try again.");
  } finally {
    setLoading(false);
  }
}

const LOADING_MESSAGES = [
  "Reading your resume…",
  "Calculating your ATS score…",
  "Identifying skill gaps…",
  "Drafting interview questions…",
];
let loadingInterval = null;

function setLoading(isLoading) {
  const row = document.getElementById("loadingRow");
  const btn = document.getElementById("analyzeBtn");
  btn.disabled = isLoading;
  if (isLoading) {
    row.classList.add("show");
    let i = 0;
    document.getElementById("loadingText").textContent = LOADING_MESSAGES[0];
    loadingInterval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      document.getElementById("loadingText").textContent = LOADING_MESSAGES[i];
    }, 1700);
  } else {
    row.classList.remove("show");
    clearInterval(loadingInterval);
  }
}

function showError(msg) {
  const el = document.getElementById("errorNote");
  el.textContent = msg;
  el.classList.add("show");
}
function hideError() {
  document.getElementById("errorNote").classList.remove("show");
}

// ---------------------------------------------------------------------------
// Render report
// ---------------------------------------------------------------------------

function scoreRing(score, max) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / max));
  const offset = c - pct * c;
  return `
    <svg viewBox="0 0 110 110">
      <circle class="ring-bg" cx="55" cy="55" r="${r}"></circle>
      <circle class="ring-fg" cx="55" cy="55" r="${r}"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
      <text x="55" y="62" text-anchor="middle" class="score-val">${score}</text>
    </svg>`;
}

function renderReport(data, meta) {
  document.getElementById("atsRing").innerHTML = scoreRing(data.atsScore, 100);
  document.getElementById("summaryText").textContent = data.summary || "—";

  fillMarkList("strengthsList", data.strengths, "+");
  fillMarkList("weaknessesList", data.weaknesses, "–");

  const chipsWrap = document.getElementById("skillChips");
  chipsWrap.innerHTML = "";
  (data.missingSkills || []).forEach((skill) => {
    const chip = document.createElement("span");
    chip.className = "skill-chip";
    chip.textContent = skill;
    chipsWrap.appendChild(chip);
  });

  const stepsList = document.getElementById("stepsList");
  stepsList.innerHTML = "";
  (data.suggestions || []).forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="step-num">${i + 1}.</span><span>${escapeHtml(s)}</span>`;
    stepsList.appendChild(li);
  });

  const qaList = document.getElementById("qaList");
  qaList.innerHTML = "";
  (data.interviewQuestions || []).forEach((q, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="qa-badge">Q${i + 1}</span><span>${escapeHtml(q)}</span>`;
    qaList.appendChild(li);
  });

  document.getElementById("exportBtn").onclick = () => exportReport(data, meta);
}

function fillMarkList(id, items, symbol) {
  const list = document.getElementById(id);
  list.innerHTML = "";
  (items || []).forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="mark-icon">${symbol}</span><span>${escapeHtml(item)}</span>`;
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// History (kept in this browser via localStorage)
// ---------------------------------------------------------------------------

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveToHistory(data, fileName) {
  const history = loadHistory();
  history.unshift({
    id: Date.now(),
    fileName,
    date: new Date().toLocaleString(),
    atsScore: data.atsScore,
    data,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  const list = document.getElementById("historyList");
  const empty = document.getElementById("historyEmpty");
  list.innerHTML = "";
  if (!history.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  history.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <span><span class="h-name">${escapeHtml(entry.fileName)}</span><span class="h-meta">${entry.date}</span></span>
      <span class="h-score">${entry.atsScore}/100</span>`;
    item.addEventListener("click", () => {
      renderReport(entry.data, { fileName: entry.fileName });
      document.getElementById("report").hidden = false;
      document.getElementById("report").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    list.appendChild(item);
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function exportReport(data, meta) {
  const lines = [];
  lines.push("RESUMEGENIUS AI — RESUME ANALYSIS REPORT");
  lines.push(`File: ${meta.fileName || "—"}`);
  if (meta.role) lines.push(`Target role: ${meta.role}`);
  lines.push("");
  lines.push(`ATS Score: ${data.atsScore}/100`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push(`  ${data.summary || ""}`);
  lines.push("");
  lines.push("STRENGTHS");
  (data.strengths || []).forEach((s) => lines.push(`  + ${s}`));
  lines.push("");
  lines.push("WEAKNESSES");
  (data.weaknesses || []).forEach((s) => lines.push(`  - ${s}`));
  lines.push("");
  lines.push("MISSING SKILLS");
  (data.missingSkills || []).forEach((s) => lines.push(`  - ${s}`));
  lines.push("");
  lines.push("IMPROVEMENT SUGGESTIONS");
  (data.suggestions || []).forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  lines.push("");
  lines.push("LIKELY INTERVIEW QUESTIONS");
  (data.interviewQuestions || []).forEach((q, i) => lines.push(`  Q${i + 1}. ${q}`));

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resumegenius-report.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// New analysis / scroll buttons
// ---------------------------------------------------------------------------

function setupResetButtons() {
  document.getElementById("scrollToUpload").addEventListener("click", () => {
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("newReviewBtn").addEventListener("click", () => {
    document.getElementById("report").hidden = true;
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  populateRoleSelect();
  setupUpload();
  setupAnalyze();
  setupResetButtons();
  renderHistory();
});
