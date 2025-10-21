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

### 2. Clone Template for a Submission

When you get a submission URL from the Tutly website, use it like this:

```bash
npx tutly submission <submission_id>
```

This will:

- Download the template files for your submission
- Create them in your current directory
- Add a `.tutly.json` metadata file

### 3. Work on Your Submission

Edit the files as needed to complete your assignment.

### 4. Submit Your Work

```bash
tutly submit
```

This will upload all your files to Tutly.

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

### `tutly submission <submission_id>`

Clone template files for a submission.

```bash
tutly submission submission_123

# Clone to a specific directory
tutly submission submission_123 --output ./my-submission
```

### `tutly submit`

Submit your work.

```bash
tutly submit

# Submit from a specific directory
tutly submit --dir ./my-submission
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
