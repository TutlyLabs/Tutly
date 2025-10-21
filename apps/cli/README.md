# Tutly CLI

Command line interface for Tutly platform - simple submission workflow.

## Installation

```bash
npm install -g @tutly/cli
# or use with npx
npx @tutly/cli
```

## Quick Start

### 1. Login

```bash
tutly login
```

You'll be prompted for your username and password.

### 2. Clone Template for an Assignment

When you get an assignment URL from the Tutly website like:
`https://learn.tutly.in/playgrounds/sandbox?assignmentId=assignment_id`

Use the assignment ID to clone the template:

```bash
npx tutly assignment assignment_id
```

This will:

- Download the template files for your assignment
- Create them in a new directory (named after the assignment)
- Add a `.tutly.json` metadata file
- Create a `package.json` if dependencies are required

**Note:** By default, a new directory is created. Use `--output .` to clone into the current directory.

### 3. Work on Your Assignment

Edit the files as needed to complete your assignment.

### 4. Submit Your Work

```bash
tutly submit
```

This will upload all your files to Tutly for review.

## Commands

### `tutly login`

Authenticate with Tutly using your username and password.

```bash
tutly login
```

### `tutly logout`

Log out from Tutly.

```bash
tutly logout
```

### `tutly whoami`

Show your current user information.

```bash
tutly whoami
```

### `tutly assignment <assignment_id>`

Clone template files for an assignment. By default, creates a new directory named after the assignment.

```bash
# Creates a new directory automatically
tutly assignment assignment_id

# Clone into current directory
tutly assignment assignment_id --output .

# Clone to a custom directory name
tutly assignment assignment_id --output ./my-assignment
```

### `tutly submit`

Submit your work for review.

```bash
tutly submit

# Submit from a specific directory
tutly submit --dir ./my-assignment
```

## Configuration

The CLI stores configuration in:

- **macOS/Linux**: `~/.config/tutly/`
- **Windows**: `%APPDATA%\tutly\`

Files:

- `config.json` - API URL and settings
- `auth.json` - Authentication tokens

### Custom API URL

Set a custom API URL using environment variable:

```bash
export TUTLY_API_URL="https://your-tutly-instance.com/api"
```

Or edit `~/.config/tutly/config.json`:

```json
{
  "apiBaseUrl": "https://your-tutly-instance.com/api",
  "telemetry": true,
  "updateNotifications": true
}
```

## Development

### Local Testing

```bash
# Install dependencies
npm install

# Build the CLI
npm run build

# Test locally using ./bin/run
./bin/run --help
./bin/run login
./bin/run whoami
./bin/run assignment <assignment_id>
./bin/run submit

# Or use the test script
./test-cli.sh
```

### Link Globally (Optional)

To use `tutly` command instead of `./bin/run`:

```bash
npm link

# Now you can use it globally
tutly login
tutly whoami
```

### Unlink

```bash
npm unlink -g @tutly/cli
```

## License

MIT
