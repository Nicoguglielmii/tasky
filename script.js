// ---------------------------------------------------------------------------
// Tasky — a small, dependency-free to-do list
// State lives in `tasks` and is persisted to localStorage on every change.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "tasky.tasks";
const FILTER_KEY = "tasky.filter";

const form = document.getElementById("taskForm");
const input = document.getElementById("taskInput");
const list = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const itemsLeftEl = document.getElementById("itemsLeft");
const clearCompletedBtn = document.getElementById("clearCompleted");
const filterButtons = document.querySelectorAll(".filter-btn");
const template = document.getElementById("taskTemplate");

let tasks = loadTasks();
let currentFilter = localStorage.getItem(FILTER_KEY) || "all";

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadTasks() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function visibleTasks() {
  if (currentFilter === "active") return tasks.filter((t) => !t.completed);
  if (currentFilter === "completed") return tasks.filter((t) => t.completed);
  return tasks;
}

function render() {
  list.innerHTML = "";

  const visible = visibleTasks();
  emptyState.hidden = tasks.length > 0;
  emptyState.textContent =
    tasks.length === 0
      ? "Nothing here yet. Add your first task above."
      : "No tasks match this filter.";
  emptyState.hidden = visible.length > 0;

  visible.forEach((task) => list.appendChild(renderTask(task)));

  const left = tasks.filter((t) => !t.completed).length;
  itemsLeftEl.textContent = `${left} ${left === 1 ? "task" : "tasks"} left`;

  filterButtons.forEach((btn) => {
    const isActive = btn.dataset.filter === currentFilter;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
}

function renderTask(task) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;
  node.classList.toggle("is-completed", task.completed);

  const checkBtn = node.querySelector(".task__check");
  checkBtn.setAttribute("aria-pressed", String(task.completed));
  checkBtn.addEventListener("click", () => toggleTask(task.id));

  const textEl = node.querySelector(".task__text");
  textEl.textContent = task.text;
  textEl.addEventListener("dblclick", () => startEditing(textEl, task.id));
  textEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (textEl.isContentEditable) finishEditing(textEl, task.id);
      else startEditing(textEl, task.id);
    }
    if (event.key === "Escape" && textEl.isContentEditable) {
      cancelEditing(textEl, task.text);
    }
  });

  const deleteBtn = node.querySelector(".task__delete");
  deleteBtn.addEventListener("click", () => deleteTask(task.id, node));

  return node;
}

// ---------------------------------------------------------------------------
// Inline editing
// ---------------------------------------------------------------------------

function startEditing(textEl, id) {
  textEl.contentEditable = "true";
  textEl.focus();
  document.execCommand("selectAll", false, null);

  const onBlur = () => finishEditing(textEl, id);
  textEl.addEventListener("blur", onBlur, { once: true });
}

function finishEditing(textEl, id) {
  textEl.contentEditable = "false";
  const newText = textEl.textContent.trim();
  const task = tasks.find((t) => t.id === id);

  if (!newText) {
    deleteTask(id, textEl.closest(".task"));
    return;
  }

  if (task) task.text = newText;
  textEl.textContent = newText;
  saveTasks();
}

function cancelEditing(textEl, originalText) {
  textEl.textContent = originalText;
  textEl.contentEditable = "false";
  textEl.blur();
}

// ---------------------------------------------------------------------------
// Task actions
// ---------------------------------------------------------------------------

function addTask(text) {
  tasks.unshift({
    id: makeId(),
    text,
    completed: false,
    createdAt: Date.now(),
  });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
}

function deleteTask(id, node) {
  if (!node) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
    return;
  }

  node.classList.add("is-leaving");
  node.addEventListener(
    "animationend",
    () => {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      render();
    },
    { once: true }
  );
}

function clearCompleted() {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  localStorage.setItem(FILTER_KEY, filter);
  render();
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  addTask(value);
  input.value = "";
  input.focus();
});

clearCompletedBtn.addEventListener("click", clearCompleted);

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

render();
