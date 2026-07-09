const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data", "tasks.json");
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
const VALID_STATUSES = ["opened", "work_in_progress", "completed"];

app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status || (task.completed ? "completed" : "opened"),
    taskDate: task.taskDate || task.createdAt || new Date().toISOString(),
    createdAt: task.createdAt || new Date().toISOString(),
  };
}

function readTasks() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    const tasks = JSON.parse(data);
    return tasks.map(normalizeTask);
  } catch {
    return [];
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}

app.get("/api/tasks", (req, res) => {
  res.json(readTasks());
});

app.post("/api/tasks", (req, res) => {
  const { title, taskDate, status } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Task title is required" });
  }

  if (!taskDate) {
    return res.status(400).json({ error: "Date and time are required" });
  }

  const parsedDate = new Date(taskDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: "Invalid date and time" });
  }

  const taskStatus = status && VALID_STATUSES.includes(status) ? status : "opened";

  const tasks = readTasks();
  const newTask = {
    id: Date.now(),
    title: title.trim(),
    status: taskStatus,
    taskDate: parsedDate.toISOString(),
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  writeTasks(tasks);

  res.status(201).json(newTask);
});

app.patch("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const tasks = readTasks();
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (req.body.title !== undefined) {
    if (!req.body.title.trim()) {
      return res.status(400).json({ error: "Task title is required" });
    }
    task.title = req.body.title.trim();
  }

  if (req.body.taskDate !== undefined) {
    const parsedDate = new Date(req.body.taskDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date and time" });
    }
    task.taskDate = parsedDate.toISOString();
  }

  if (req.body.status !== undefined) {
    if (!VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    task.status = req.body.status;
  }

  writeTasks(tasks);
  res.json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const tasks = readTasks();
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  const deleted = tasks.splice(index, 1)[0];
  writeTasks(tasks);

  res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`Todo app running at http://localhost:${PORT}/Todo.html`);
});
