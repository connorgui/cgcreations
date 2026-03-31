const authGateEl = document.getElementById("homework-auth-gate");
const homeworkAppEl = document.getElementById("homework-app");
const signInButtonEl = document.getElementById("homework-signin-button");
const signalEl = document.getElementById("homework-signal-light");
const statusEl = document.getElementById("homework-status-text");
const totalCountEl = document.getElementById("homework-total-count");
const pendingCountEl = document.getElementById("homework-pending-count");
const dueSoonCountEl = document.getElementById("homework-due-soon-count");
const completedCountEl = document.getElementById("homework-completed-count");
const formTitleEl = document.getElementById("homework-form-title");
const titleEl = document.getElementById("homework-title");
const subjectEl = document.getElementById("homework-subject");
const dueDateEl = document.getElementById("homework-due-date");
const completedEl = document.getElementById("homework-completed");
const notesEl = document.getElementById("homework-notes");
const saveButtonEl = document.getElementById("homework-save-button");
const clearButtonEl = document.getElementById("homework-clear-button");
const emptyStateEl = document.getElementById("homework-empty-state");
const listEl = document.getElementById("homework-list");

const filterButtons = {
  all: document.getElementById("homework-filter-all"),
  pending: document.getElementById("homework-filter-pending"),
  dueSoon: document.getElementById("homework-filter-due-soon"),
  completed: document.getElementById("homework-filter-completed")
};

let signedIn = false;
let items = [];
let selectedFilter = "all";
let editingId = null;

function setSignal(state) {
  signalEl.classList.remove("signal-idle", "signal-success", "signal-error");
  signalEl.classList.add(`signal-${state}`);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function formatDate(dateString) {
  if (!dateString) {
    return "No due date";
  }

  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getDaysUntilDue(dateString) {
  if (!dateString) {
    return null;
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(`${dateString}T00:00:00`);
  const differenceMs = dueDate.getTime() - todayMidnight.getTime();
  return Math.round(differenceMs / (1000 * 60 * 60 * 24));
}

function isDueSoon(item) {
  if (item.completed) {
    return false;
  }

  const daysUntilDue = getDaysUntilDue(item.dueDate);
  return daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;
}

function getFilteredItems() {
  if (selectedFilter === "pending") {
    return items.filter((item) => !item.completed);
  }

  if (selectedFilter === "completed") {
    return items.filter((item) => item.completed);
  }

  if (selectedFilter === "dueSoon") {
    return items.filter((item) => isDueSoon(item));
  }

  return items;
}

function updateFilterButtons() {
  Object.entries(filterButtons).forEach(([filter, button]) => {
    button.classList.toggle("is-selected", filter === selectedFilter);
  });
}

function updateStats() {
  totalCountEl.textContent = String(items.length);
  pendingCountEl.textContent = String(items.filter((item) => !item.completed).length);
  completedCountEl.textContent = String(items.filter((item) => item.completed).length);
  dueSoonCountEl.textContent = String(items.filter((item) => isDueSoon(item)).length);
}

function renderList() {
  const filteredItems = getFilteredItems();
  updateFilterButtons();
  listEl.innerHTML = "";
  emptyStateEl.classList.toggle("hidden", filteredItems.length !== 0);

  for (const item of filteredItems) {
    const daysUntilDue = getDaysUntilDue(item.dueDate);
    const dueLabel = item.dueDate
      ? (daysUntilDue === 0 ? "Due today" : daysUntilDue === 1 ? "Due tomorrow" : daysUntilDue !== null && daysUntilDue > 1 ? `Due in ${daysUntilDue} days` : "Past due")
      : "No due date";

    const card = document.createElement("article");
    card.className = `homework-item ${item.completed ? "is-complete" : ""}`;
    card.innerHTML = `
      <div class="homework-item-head">
        <div>
          <p class="spoken-label">${item.subject}</p>
          <h3>${item.title}</h3>
        </div>
        <span class="homework-due-pill ${isDueSoon(item) ? "is-urgent" : ""}">${dueLabel}</span>
      </div>
      <p class="support-text">Due: ${formatDate(item.dueDate)}</p>
      <p class="homework-notes-copy">${item.notes || "No notes added."}</p>
      <div class="homework-item-actions">
        <button type="button" class="secondary" data-homework-action="toggle">${item.completed ? "Mark Pending" : "Mark Complete"}</button>
        <button type="button" class="secondary" data-homework-action="edit">Edit</button>
        <button type="button" class="secondary" data-homework-action="delete">Delete</button>
      </div>
    `;

    card.querySelector("[data-homework-action='toggle']").addEventListener("click", () => {
      saveItem({
        ...item,
        completed: !item.completed
      }, false);
    });

    card.querySelector("[data-homework-action='edit']").addEventListener("click", () => {
      editingId = item.id;
      formTitleEl.textContent = "Edit Assignment";
      titleEl.value = item.title;
      subjectEl.value = item.subject;
      dueDateEl.value = item.dueDate || "";
      notesEl.value = item.notes || "";
      completedEl.checked = item.completed;
      saveButtonEl.textContent = "Update Assignment";
      titleEl.focus();
      setSignal("idle");
      setStatus(`Editing "${item.title}". Update the form and save when you are ready.`);
    });

    card.querySelector("[data-homework-action='delete']").addEventListener("click", async () => {
      try {
        await fetchJson(`/api/homework/${item.id}`, { method: "DELETE" });
        items = items.filter((candidate) => candidate.id !== item.id);
        if (editingId === item.id) {
          resetForm();
        }
        updateStats();
        renderList();
        setSignal("success");
        setStatus(`Deleted "${item.title}".`);
      } catch (error) {
        setSignal("error");
        setStatus(error.message);
      }
    });

    listEl.appendChild(card);
  }
}

function resetForm() {
  editingId = null;
  formTitleEl.textContent = "Add Assignment";
  titleEl.value = "";
  subjectEl.value = "";
  dueDateEl.value = "";
  notesEl.value = "";
  completedEl.checked = false;
  saveButtonEl.textContent = "Save Assignment";
}

function getPayloadFromForm() {
  return {
    title: titleEl.value.trim(),
    subject: subjectEl.value.trim(),
    dueDate: dueDateEl.value || null,
    notes: notesEl.value.trim(),
    completed: completedEl.checked
  };
}

function fetchJson(url, options = {}) {
  return window.fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Request failed.");
    }
    return payload;
  });
}

async function saveItem(payload, useCurrentEditingId = true) {
  const itemId = useCurrentEditingId ? editingId : payload.id;
  const method = itemId ? "PUT" : "POST";
  const url = itemId ? `/api/homework/${itemId}` : "/api/homework";
  const body = {
    title: payload.title,
    subject: payload.subject,
    dueDate: payload.dueDate,
    notes: payload.notes,
    completed: payload.completed
  };

  const response = await fetchJson(url, {
    method,
    body: JSON.stringify(body)
  });

  if (itemId) {
    items = items.map((item) => item.id === response.item.id ? response.item : item);
  } else {
    items.unshift(response.item);
  }

  updateStats();
  renderList();
  resetForm();
  setSignal("success");
  setStatus(itemId ? "Assignment updated." : "Assignment added.");
}

async function loadHomework() {
  if (!signedIn) {
    return;
  }

  try {
    const response = await fetchJson("/api/homework", { method: "GET" });
    items = response.items || [];
    updateStats();
    renderList();
    setSignal(items.length ? "idle" : "success");
    setStatus(items.length ? "Homework loaded. Pick what to tackle next." : "You are signed in. Add your first assignment to get started.");
  } catch (error) {
    setSignal("error");
    setStatus(error.message);
  }
}

function applyAuthState(detail) {
  signedIn = Boolean(detail && detail.signedIn);
  authGateEl.classList.toggle("hidden", signedIn);
  homeworkAppEl.classList.toggle("hidden", !signedIn);

  if (!signedIn) {
    items = [];
    resetForm();
    updateStats();
    renderList();
    setSignal("idle");
    setStatus("Sign in to save homework to your account.");
    return;
  }

  loadHomework();
}

Object.entries(filterButtons).forEach(([filter, button]) => {
  button.addEventListener("click", () => {
    selectedFilter = filter;
    renderList();
  });
});

saveButtonEl.addEventListener("click", async () => {
  try {
    await saveItem(getPayloadFromForm(), true);
  } catch (error) {
    setSignal("error");
    setStatus(error.message);
  }
});

clearButtonEl.addEventListener("click", () => {
  resetForm();
  setSignal("idle");
  setStatus("Form cleared.");
});

signInButtonEl.addEventListener("click", () => {
  window.siteAuth?.openSignIn();
});

window.addEventListener("site-auth-change", (event) => {
  applyAuthState(event.detail || {});
});

applyAuthState(window.siteAuth?.getState() || { signedIn: false });
