# MindfulMoves

An NLP-powered chess platform that provides immersive and authentic practice experiences for players of all skill levels.

---

## Prerequisites

You need **Node.js** (for the frontend) and **uv** (for the Python backend). If you already have them, skip the relevant section.

### Install Node.js

1. Go to [https://nodejs.org](https://nodejs.org) and download the **LTS** installer for your OS.
2. Run the installer and follow the prompts (default options are fine).
3. Verify the installation by opening a terminal and running:
   ```
   node --version
   npm --version
   ```

### Install uv (Python package manager)

**Windows** — run this in PowerShell:
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

After installation, restart your terminal, then verify:
```
uv --version
```

> uv manages Python for you — you do **not** need to install Python separately.

---

## Project Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd MindfulMoves
```

### 2. Backend setup

```bash
cd backend
```

Create a `.env` file inside the `backend/` folder with the following contents:

```env
DATABASE_URL=sqlite:///./local.db
FRONTEND_URL=http://localhost:5173
JWT_SECRET_KEY=your-secret-key-here
```

> Replace `your-secret-key-here` with any long random string.

Install dependencies:

```bash
uv sync
```

> **Important:** `uv.lock` is the source of truth for exact dependency versions and must always be kept up to date. If you ever add, remove, or change a dependency in `pyproject.toml` (the backend's dependency config file), run `uv lock` before `uv sync` to update the lockfile first. Committing code without an updated `uv.lock` will cause other developers to install different package versions than you.

Update database with difficulty column:

```bash
uv run python migrations/add_difficulty.py
```

### 3. Frontend setup

Open a new terminal and run:

```bash
cd frontend
```

Create a `.env` file inside the `frontend/` folder:

```env
VITE_API_URL=http://localhost:8000
```

> Make sure the select encoding is UTF-8 with BOM: if not (in VSCode) look at the bottom right for select encoding > save with encoding > UTF-8 with BOM.

Install dependencies:

```bash
npm install
```

---

## Running the App

You need two terminals open at the same time — one for the backend and one for the frontend.

**Terminal 1 — Backend** (from the `backend/` directory):
```bash
uv run python server.py
```

The API will be available at `http://localhost:8000`. You can explore and test all endpoints at `http://localhost:8000/docs`.

**Terminal 2 — Frontend** (from the `frontend/` directory):
```bash
npm run dev
```

Open `http://localhost:5173` in your browser to use the app.
