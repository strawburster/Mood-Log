const moodColors = {
  "-2": "red",
  "-1": "orange",
  "0": "white",
  "1": "yellow",
  "2": "green"
};
const emojiMap = {
  '-2': '🟥',
  '-1': '🟧',
  '0': '⬜',
  '1': '🟨',
  '2': '🟩'
};

let fields = [];

function loadOptions() {
  options = JSON.parse(localStorage.getItem(optionsKey)) || {};
  fields = Object.keys(options);
  buildTags();
}

const optionsKey = "options.csv";
const logKey = "mood log.csv";
const maxDays = 14;

let options = {};
let moodValue = null;

function setToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const dd = String(today.getDate()).padStart(2, '0');
  const localDate = `${yyyy}-${mm}-${dd}`;
  document.getElementById("entry-date").value = localDate;
  loadEntry();
}

function toggleFold(id) {
  const el = document.getElementById(id);
  el.classList.toggle("open");
}

function buildMoodSelector() {
  const container = document.getElementById("mood-options");
  container.innerHTML = "";

  // Remove duplicate "Mood:" label (assumes one already exists in HTML)
  // So we skip adding one here

  // Mood button row
  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.gap = "8px";
  buttonRow.style.marginBottom = "0.5em";

  for (let i = -2; i <= 2; i++) {
    const btn = document.createElement("button");
    btn.className = "emoji";
    btn.dataset.value = i;
    btn.style.backgroundColor = moodColors[i];
    btn.style.width = "32px";
    btn.style.height = "32px";
    btn.style.border = "1px solid #666"; // ← gives white button a border in light mode
    btn.style.borderRadius = "4px";
    btn.style.padding = "0";
    btn.style.flexShrink = "0";

    if (moodValue === i) {
      btn.classList.add("selected");
      btn.style.outline = "2px solid var(--highlight)";
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      moodValue = (moodValue === i) ? null : i;
      buildMoodSelector();
    });

    buttonRow.appendChild(btn);
  }

  container.appendChild(buttonRow);

  // Clear Mood button
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear Mood";
  clearBtn.style.marginBottom = "0.5em"; // ← reduce vertical gap
  clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    moodValue = null;
    buildMoodSelector();
  });

  container.appendChild(clearBtn);
}

function buildTags(entryTags = {}) {
  const tags = document.getElementById("tags");
  tags.innerHTML = "";

  const labelMap = {
    "emotions": "Emotions",
    "life": "Life",
    "goodhabits": "Good Habits",
    "badhabits": "Bad Habits",
    "symptoms": "Symptoms",
    "skills": "Skills"
  };

  function normalizeKey(str) {
    return str.toLowerCase().replace(/\s+/g, "");
  }

  Object.keys(options).forEach(field => {
    const div = document.createElement("div");
    div.dataset.field = field;

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "1em";

    const label = document.createElement("label");
    label.textContent = labelMap[normalizeKey(field)] || field;

    const clear = document.createElement("button");
    clear.textContent = "Clear";
    clear.onclick = () => {
      div.querySelectorAll("button.option").forEach(b => b.classList.remove("selected"));
    };

    header.appendChild(label);
    header.appendChild(clear);
    div.appendChild(header);

    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.marginTop = "0.25em";

    const known = new Set(options[field] || []);
    const used = new Set((entryTags[field] || "").split(",").map(s => s.trim()).filter(Boolean));
    const all = Array.from(new Set([...known, ...used]));

    all.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.textContent = opt;
      if (used.has(opt)) btn.classList.add("selected");
      btn.onclick = () => btn.classList.toggle("selected");
      buttonsContainer.appendChild(btn);
    });

    div.appendChild(buttonsContainer);
    div.style.marginBottom = "1em";

    tags.appendChild(div);
  });
  console.log("Finished building tags.");
}

function collectTags() {
  console.log("Running collectTags...");
  console.log("Contents of #tags:", document.querySelector("#tags")?.innerHTML);
  const out = {};
  Object.keys(options).forEach(field => {
    const div = document.querySelector(`#tags div[data-field="${field}"]`);
    if (!div) {
      console.warn(`Missing tag container for field: ${field}`);
      return;
    }
    const selected = div.querySelectorAll("button.option.selected");
    out[field] = Array.from(selected).map(b => b.textContent).join(", ");
  });
  return out;
}

function clearForm() {
  document.getElementById("freetext").value = "";
  document.querySelectorAll("button.option").forEach(b => b.classList.remove("selected"));
  moodValue = null;
  buildMoodSelector();
}

function saveEntry() {
  const date = document.getElementById("entry-date").value;
  if (!date) return alert("Choose a date.");
  const tags = collectTags();
  const comment = document.getElementById("freetext").value;
  if (comment.length > 500) return alert("Comment too long");

  let rows = getCSV(logKey);
  rows = rows.filter(r => r[0] !== date);
  const moodToSave = (moodValue === null) ? "" : moodValue;
  const newRow = [
    date,
    moodToSave,
    ...fields.map(f => tags[f] || ""),
    comment
  ];

  rows.push(newRow);
  console.log("Saving row:", newRow);
  saveCSV(logKey, rows);
  loadRecent();
  clearForm();
}

function loadRecent() {
  const sel = document.getElementById("recent-entries");
  sel.innerHTML = `<option value="">--select--</option>`;
  const rows = getCSV(logKey);
  const today = new Date();
  rows
    .filter(r => {
      const d = new Date(r[0]);
      return today - d <= maxDays * 864e5;
    })
    .sort((a,b) => new Date(b[0]) - new Date(a[0]))
    .forEach(r => {
      const opt = document.createElement("option");
      opt.value = r[0];
      opt.textContent = r[0];
      sel.appendChild(opt);
    });
}

function loadSelectedEntry() {
  const date = document.getElementById("recent-entries").value;
  document.getElementById("entry-date").value = date;
  loadEntry();
}

function loadEntry() {
  const date = document.getElementById("entry-date").value;
  const rows = getCSV(logKey);
  const entry = rows.find(r => r[0] === date);
  if (!entry) return clearForm();

  const mvRaw = entry[1];
  moodValue = (mvRaw === "" || mvRaw === null || mvRaw === undefined) ? null : Number(mvRaw);
  buildMoodSelector();

  const tagValues = {};
  fields.forEach((field, i) => {
    tagValues[field] = entry[i + 2] || "";
  });

  buildTags(tagValues);

  const possibleComment = entry[fields.length + 2] || "";
  document.getElementById("freetext").value = possibleComment;
}

function deleteEntry() {
  const date = document.getElementById("entry-date").value;
  let rows = getCSV(logKey);
  rows = rows.filter(r => r[0] !== date);
  saveCSV(logKey, rows);
  loadRecent();
  clearForm();
}

function shareWeek() {
  const today = new Date();
  const rows = getCSV(logKey);
  let result = "";

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Format date as YYYY-MM-DD to match your CSV
    const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

    const entry = rows.find(r => r[0] === dateStr);
    if (entry) {
      const moodRaw = entry[1];
      const moodNum = (moodRaw === "" || moodRaw == null) ? null : Number(moodRaw);
      result += moodNum !== null ? emojiMap[moodNum] : "⬛";
    } else {
      result += "⬛";
    }
  }

  navigator.clipboard.writeText(result);
  alert("Last 7 days mood copied:\n" + result);
}

function shareDetailedWeek() {
  const today = new Date();
  const rows = getCSV(logKey);
  let result = "";

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    const displayDate = `${(d.getMonth() + 1)}/${d.getDate()}`;

    const entry = rows.find(r => r[0] === dateStr);
    const moodEmoji = entry && entry[1] !== "" ? emojiMap[entry[1]] || "⬛" : "⬛";

    let tagString = "";
    let comment = "";

    if (entry) {
      const tagValues = entry.slice(2, 2 + fields.length);
      tagString = tagValues.filter(Boolean).join(", ");
      comment = entry[2 + fields.length] || "";
    }

    result += `# ${displayDate} ${moodEmoji}\n`;
    result += `**Tags:** ${tagString}\n`;
    result += `**Comments:** ${comment}\n\n`;
  }

  navigator.clipboard.writeText(result.trim());
  alert("Detailed mood log copied:\n\n" + result.trim());
}

function getCSV(key) {
  const data = localStorage.getItem(key);
  return data ? data.trim().split("\n").map(r => r.split("\t")) : [];
}

function saveCSV(key, rows) {
  const data = rows.map(r => r.join("\t")).join("\n");
  localStorage.setItem(key, data);
}

function init() {
  if (!localStorage.getItem(optionsKey)) {
    const defaultOptions = {
      "Emotions": [
        "Love", "Joy", "Fear", "Anger", "Sadness", "Surprise", "Happy", "Content", "Excited", "Hopeful",
        "Grateful", "Affectionate", "Anxious", "Nervous", "Scared", "Frustrated", "Annoyed", "Angry", "Jealous",
        "Lonely", "Hurt", "Disappointed", "Guilty", "Ashamed", "Surprised", "Confused", "Overwhelmed"
      ],
      "Life": [
        "Work", "School", "Hobby", "Paperwork", "Housework", "Errands", "Friends", "Family",
        "SignificantOther", "Doctor", "Therapist"
      ],
      "Good Habits": [
        "HealthyMeal", "Hydration", "SleepHygiene", "Exercise", "Shower", "OralCare",
        "HairCare", "SkinCare"
      ],
      "Bad Habits": [
        "JunkFood", "SubstanceUse", "Alcohol", "Nicotine", "Marijuana", "Caffeine", "Gambling",
        "BingeEating", "SelfHarm", "Pornography", "SocialMedia", "SleepSabotage"
      ],
      "Negative Symptoms": [
        "Insomnia", "Pain", "Fatigue", "SuicidalIdeation", "Menstruation", "BrainFog",
        "Allergy", "Infection", "StomachUpset"
      ],
      "DBT Skills": [
        "WiseMind", "Observe", "Describe", "Participate", "OneMindfully", "NonJudgmentally",
        "Effectively", "RadicalAcceptance", "TurningTheMind", "TIPP", "STOP", "SensorySelfSoothe",
        "OppositeToEmotionAction", "ACCEPTS", "IMPROVE", "ProsAndCons", "DEARMAN", "GIVE",
        "FAST", "PLEASE", "ClarifyValues", "ClarifyGoals", "AccumulatePositives", "CheckTheFacts",
        "BuildMastery", "BehaviorChainAnalysis"
      ]
    };
    localStorage.setItem(optionsKey, JSON.stringify(defaultOptions));
  }

  loadOptions();
  loadRecent();
  buildMoodSelector();
  buildOptionsEditor();
}

function buildOptionsEditor() {
  const editor = document.getElementById("options-editor");
  editor.innerHTML = "";
  Object.entries(options).forEach(([field, values]) => {
    const label = document.createElement("label");
    label.textContent = field;
    const box = document.createElement("textarea");
    box.className = "wrap";
    box.dataset.field = field;
    box.value = values.join("\n");
    editor.appendChild(label);
    editor.appendChild(box);
  });
}

function saveOptions() {
  const boxes = document.querySelectorAll("#options-editor textarea");
  const updated = {};
  boxes.forEach(box => {
    const field = box.dataset.field;
    updated[field] = box.value.split("\n").map(s => s.trim()).filter(Boolean);
  });
  localStorage.setItem(optionsKey, JSON.stringify(updated));
  loadOptions();
  buildOptionsEditor();
}

function exportCSV() {
  const rows = getCSV(logKey);
  const blob = new Blob([rows.map(r => r.join("\t")).join("\n")], { type: "text/tab-separated-values" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = logKey;
  a.click();
}

function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    localStorage.setItem(logKey, evt.target.result);
    loadRecent();
  };
  reader.readAsText(file);
}

function exportOptions() {
  const blob = new Blob([JSON.stringify(options, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "options.json";
  a.click();
}

function importOptions(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const parsed = JSON.parse(evt.target.result);
      localStorage.setItem(optionsKey, JSON.stringify(parsed));
      loadOptions();
      buildOptionsEditor();
    } catch (err) {
      alert("Invalid JSON");
    }
  };
  reader.readAsText(file);
}

function toggleTheme() {
  const checkbox = document.getElementById("dark-mode-toggle");
  if (checkbox.checked) {
    document.body.classList.add("dark");
    localStorage.setItem("darkMode", "true");
  } else {
    document.body.classList.remove("dark");
    localStorage.setItem("darkMode", "false");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const darkMode = localStorage.getItem("darkMode");
  const checkbox = document.getElementById("dark-mode-toggle");
  if (darkMode === "true") {
    document.body.classList.add("dark");
    if (checkbox) checkbox.checked = true;
  } else {
    document.body.classList.remove("dark");
    if (checkbox) checkbox.checked = false;
  }
});

window.addEventListener("DOMContentLoaded", init);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch(e => console.error('Service Worker registration failed:', e));
}
