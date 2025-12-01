# Tutly CLI

The official command line interface for the Tutly platform. It helps you manage your assignments, save your progress, and submit your work directly from your terminal.

## Installation

```bash
npm install -g tutly
# or run directly with npx
npx tutly <command>
```

## Quick Start

### 1. Login

Authenticate with your Tutly account to access your courses and assignments.

```bash
tutly login
```

### 2. Start Assignment

Download the starter code and workspace for a specific assignment. You can find the Assignment ID on the assignment page in Tutly.

```bash
tutly assignment <assignment_id>
```

This creates a new directory with all the necessary files to get started.

### 3. Work & Save

Work on your assignment locally using your favorite editor. You can save your progress to the cloud at any time without submitting it for review.

```bash
tutly save
```

This uploads your current progress to Tutly, so you can pick up where you left off later or from another device.

### 4. Submit

When you've completed the assignment and are ready for grading, submit your work.

```bash
tutly submit
```

This uploads your final code and marks the assignment as **Submitted**.

---

## Playgrounds

The CLI also powers **Tutly Playgrounds**, allowing you to connect your local environment to the Tutly web IDE.

### `tutly playground`

Starts a local server that exposes your filesystem to the Tutly web interface via WebSocket. This enables features like live preview and remote editing from the browser.

```bash
# Start in the current directory
tutly playground

# Start in a specific directory
tutly playground --directory ./my-project
```

---

## Command Reference

- **`tutly login`**: Log in to your Tutly account.
- **`tutly logout`**: Log out and clear stored credentials.
- **`tutly whoami`**: Display the currently logged-in user.
- **`tutly assignment <id>`**: Initialize a new assignment workspace.
- **`tutly save`**: Upload a snapshot of your work (does not submit).
- **`tutly submit`**: Submit your work for grading.
- **`tutly playground`**: Start the local development server for Playgrounds.

## Configuration

Configuration files are stored in:

- **macOS/Linux**: `~/.config/tutly/`
- **Windows**: `%APPDATA%\tutly\`
