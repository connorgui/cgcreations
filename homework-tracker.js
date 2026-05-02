const authGateEl = document.getElementById("homework-auth-gate");
const homeworkAppEl = document.getElementById("homework-app");
const signInButtonEl = document.getElementById("homework-signin-button");
const signalEl = document.getElementById("homework-signal-light");
const statusEl = document.getElementById("homework-status-text");
const totalCountEl = document.getElementById("homework-total-count");
const pendingCountEl = document.getElementById("homework-pending-count");
const dueSoonCountEl = document.getElementById("homework-due-soon-count");
const completedCountEl = document.getElementById("homework-completed-count");
const archivedCountEl = document.getElementById("homework-archived-count");
const formTitleEl = document.getElementById("homework-form-title");
const titleEl = document.getElementById("homework-title");
const subjectEl = document.getElementById("homework-subject");
const dueDateEl = document.getElementById("homework-due-date");
const completedEl = document.getElementById("homework-completed");
const notesEl = document.getElementById("homework-notes");
const formToggleEl = document.getElementById("homework-form-toggle");
const formToggleLabelEl = document.getElementById("homework-form-toggle-label");
const formToggleIconEl = document.querySelector(".homework-form-toggle-icon");
const formBodyEl = document.getElementById("homework-form-body");
const saveButtonEl = document.getElementById("homework-save-button");
const clearButtonEl = document.getElementById("homework-clear-button");
const emptyStateEl = document.getElementById("homework-empty-state");
const listEl = document.getElementById("homework-list");
const archivedEmptyStateEl = document.getElementById("homework-archived-empty-state");
const archivedListEl = document.getElementById("homework-archived-list");

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
let editingArchived = false;
let formOpen = false;

function normalizeDueDateValue(value) {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setSignal(state) {
  signalEl.classList.remove("signal-idle", "signal-success", "signal-error");
  signalEl.classList.add(`signal-${state}`);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setFormOpen(nextOpen) {
  formOpen = Boolean(nextOpen);
  formBodyEl.classList.toggle("hidden", !formOpen);
  formToggleEl.classList.toggle("is-open", formOpen);
  formToggleIconEl.textContent = formOpen ? "−" : "+";
  formToggleLabelEl.textContent = editingId ? "Edit Assignment" : "Add Assignment";
}

function formatDate(dateString) {
  const normalizedDate = normalizeDueDateValue(dateString);
  if (!normalizedDate) {
    return "No due date";
  }

  const date = new Date(`${normalizedDate}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getDaysUntilDue(dateString) {
  const normalizedDate = normalizeDueDateValue(dateString);
  if (!normalizedDate) {
    return null;
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(`${normalizedDate}T00:00:00`);
  const differenceMs = dueDate.getTime() - todayMidnight.getTime();
  return Math.round(differenceMs / (1000 * 60 * 60 * 24));
}

function isDueSoon(item) {
  if (item.completed || item.archived) {
    return false;
  }

  const daysUntilDue = getDaysUntilDue(item.dueDate);
  return daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;
}

function getFilteredItems() {
  const activeItems = items.filter((item) => !item.archived);

  if (selectedFilter === "pending") {
    return activeItems.filter((item) => !item.completed);
  }

  if (selectedFilter === "completed") {
    return activeItems.filter((item) => item.completed);
  }

  if (selectedFilter === "dueSoon") {
    return activeItems.filter((item) => isDueSoon(item));
  }

  return activeItems;
}

function getArchivedItems() {
  return items.filter((item) => item.archived);
}

function normalizeHomeworkItem(item) {
  return {
    ...item,
    dueDate: normalizeDueDateValue(item.dueDate),
    archived: Boolean(item.archived)
  };
}

function updateFilterButtons() {
  Object.entries(filterButtons).forEach(([filter, button]) => {
    button.classList.toggle("is-selected", filter === selectedFilter);
  });
}

function updateStats() {
  const activeItems = items.filter((item) => !item.archived);
  totalCountEl.textContent = String(activeItems.length);
  pendingCountEl.textContent = String(activeItems.filter((item) => !item.completed).length);
  completedCountEl.textContent = String(activeItems.filter((item) => item.completed).length);
  archivedCountEl.textContent = String(items.filter((item) => item.archived).length);
  dueSoonCountEl.textContent = String(activeItems.filter((item) => isDueSoon(item)).length);
}

function getDuePill(item) {
  if (item.archived) {
    return { label: "Archived", classes: "is-archived" };
  }

  if (item.completed) {
    return { label: "Completed", classes: "is-complete is-with-check" };
  }

  const daysUntilDue = getDaysUntilDue(item.dueDate);
  if (!item.dueDate) {
    return { label: "No due date", classes: "" };
  }

  if (daysUntilDue === 0) {
    return { label: "Due today", classes: "is-urgent" };
  }

  if (daysUntilDue === 1) {
    return { label: "Due tomorrow", classes: "is-urgent" };
  }

  if (daysUntilDue !== null && daysUntilDue > 1) {
    return { label: `Due in ${daysUntilDue} days`, classes: "" };
  }

  return { label: "Past due", classes: "is-overdue" };
}

function createHomeworkCard(item, options = {}) {
  const { archivedView = false } = options;
  const duePill = getDuePill(item);
  const notesCopy = item.notes || "No notes added.";

  const actions = [];
  actions.push(`<button type="button" class="secondary" data-homework-action="toggle">${item.completed ? "Mark Pending" : "Mark Complete"}</button>`);
  actions.push(`<button type="button" class="secondary" data-homework-action="edit">Edit</button>`);

  if (archivedView) {
    actions.push(`<button type="button" class="secondary" data-homework-action="archive">Unarchive</button>`);
  } else if (item.completed) {
    actions.push(`<button type="button" class="secondary" data-homework-action="archive">Archive</button>`);
  }

  actions.push(`<button type="button" class="secondary" data-homework-action="delete">Delete</button>`);

  const card = document.createElement("article");
  card.className = `homework-item ${item.completed ? "is-complete" : ""} ${item.archived ? "is-archived" : ""}`;
  card.innerHTML = `
    <div class="homework-item-head">
      <div>
        <p class="spoken-label">${item.subject}</p>
        <h3>${item.title}</h3>
      </div>
      <span class="homework-due-pill ${duePill.classes}">${duePill.label}</span>
    </div>
    <p class="support-text">Due: ${formatDate(item.dueDate)}</p>
    <p class="homework-notes-copy">${notesCopy}</p>
    <div class="homework-item-actions">
      ${actions.join("")}
    </div>
  `;

  card.querySelector("[data-homework-action='toggle']").addEventListener("click", async () => {
    try {
      const nextCompletedState = !item.completed;
      await saveItem({
        ...item,
        completed: nextCompletedState,
        archived: item.archived && item.completed ? false : item.archived
      }, false);
      setSignal("success");
      setStatus(nextCompletedState ? `Marked "${item.title}" complete.` : `Moved "${item.title}" back to pending.`);
    } catch (error) {
      setSignal("error");
      setStatus(error.message);
    }
  });

  card.querySelector("[data-homework-action='edit']").addEventListener("click", () => {
    editingId = item.id;
    editingArchived = item.archived;
    formTitleEl.textContent = "Edit Assignment";
    setFormOpen(true);
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

  const archiveButton = card.querySelector("[data-homework-action='archive']");
  if (archiveButton) {
    archiveButton.addEventListener("click", () => {
      const nextArchivedState = !item.archived;
      saveItem({
        ...item,
        archived: nextArchivedState
      }, false).then(() => {
        setSignal("success");
        setStatus(nextArchivedState ? `Archived "${item.title}".` : `Moved "${item.title}" back to your main list.`);
      }).catch((error) => {
        setSignal("error");
        setStatus(error.message);
      });
    });
  }

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

  return card;
}

function renderList() {
  const filteredItems = getFilteredItems();
  const archivedItems = getArchivedItems();
  updateFilterButtons();
  listEl.innerHTML = "";
  archivedListEl.innerHTML = "";
  emptyStateEl.classList.toggle("hidden", filteredItems.length !== 0);
  archivedEmptyStateEl.classList.toggle("hidden", archivedItems.length !== 0);

  for (const item of filteredItems) {
    listEl.appendChild(createHomeworkCard(item));
  }

  for (const item of archivedItems) {
    archivedListEl.appendChild(createHomeworkCard(item, { archivedView: true }));
  }
}

function resetForm() {
  editingId = null;
  editingArchived = false;
  formTitleEl.textContent = "Add Assignment";
  titleEl.value = "";
  subjectEl.value = "";
  dueDateEl.value = "";
  notesEl.value = "";
  completedEl.checked = false;
  saveButtonEl.textContent = "Save Assignment";
  setFormOpen(false);
}

function getPayloadFromForm() {
  return {
    title: titleEl.value.trim(),
    subject: subjectEl.value.trim(),
    dueDate: dueDateEl.value || null,
    notes: notesEl.value.trim(),
    completed: completedEl.checked,
    archived: editingArchived
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
    completed: payload.completed,
    archived: Boolean(payload.archived)
  };

  const response = await fetchJson(url, {
    method,
    body: JSON.stringify(body)
  });
  const normalizedItem = normalizeHomeworkItem(response.item);

  if (itemId) {
    items = items.map((item) => item.id === normalizedItem.id ? normalizedItem : item);
  } else {
    items.unshift(normalizedItem);
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
    items = (response.items || []).map(normalizeHomeworkItem);
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

formToggleEl.addEventListener("click", () => {
  const nextOpen = !formOpen;
  setFormOpen(nextOpen);
  if (nextOpen) {
    titleEl.focus();
  } else if (!editingId) {
    resetForm();
  }
});

signInButtonEl.addEventListener("click", () => {
  window.siteAuth?.openSignIn();
});

window.addEventListener("site-auth-change", (event) => {
  applyAuthState(event.detail || {});
});

applyAuthState(window.siteAuth?.getState() || { signedIn: false });
