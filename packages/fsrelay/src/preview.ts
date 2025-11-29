import * as vscode from 'vscode';

let previewPanel: vscode.WebviewPanel | undefined;
let statusBarItem: vscode.StatusBarItem;
let terminalWatcher: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Preview Extension is now active!');

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(globe) Preview";
    statusBarItem.command = 'preview.toggle';
    statusBarItem.tooltip = 'Toggle Preview';
    statusBarItem.show();

    // Register commands
    const togglePreviewDisposable = vscode.commands.registerCommand('preview.toggle', () => {
        togglePreview();
    });

    const openPreviewDisposable = vscode.commands.registerCommand('preview.open', () => {
        openPreview();
    });

    // Watch for terminal output to detect running servers
    if (vscode.workspace.getConfiguration('preview').get('autoDetect')) {
        startTerminalWatcher();
    }

    context.subscriptions.push(
        togglePreviewDisposable,
        openPreviewDisposable,
        statusBarItem
    );
}

function togglePreview() {
    if (previewPanel) {
        previewPanel.dispose();
        previewPanel = undefined;
    } else {
        openPreview();
    }
}

function openPreview(url?: string) {
    const config = vscode.workspace.getConfiguration('preview');
    const defaultPort = config.get('defaultPort', 3000);
    const previewUrl = url || `http://localhost:${defaultPort}`;

    if (previewPanel) {
        previewPanel.reveal();
        return;
    }

    previewPanel = vscode.window.createWebviewPanel(
        'preview',
        'Preview',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    previewPanel.webview.html = getWebviewContent(previewUrl);

    previewPanel.onDidDispose(() => {
        previewPanel = undefined;
    });

    // Add refresh button to webview
    previewPanel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'refresh':
                    if (previewPanel) {
                        previewPanel.webview.html = getWebviewContent(previewUrl);
                    }
                    return;
            }
        }
    );
}

function getWebviewContent(url: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
        }
        
        .toolbar {
            height: 40px;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            padding: 0 10px;
        }
        
        .url-input {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 6px 10px;
            margin-right: 10px;
            border-radius: 2px;
        }
        
        .refresh-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
        }
        
        .refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        iframe {
            width: 100%;
            height: calc(100vh - 40px);
            border: none;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <input type="text" class="url-input" id="urlInput" value="${url}" placeholder="Enter URL...">
        <button class="refresh-btn" onclick="refreshPreview()">Refresh</button>
    </div>
    <iframe id="previewFrame" src="${url}"></iframe>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function refreshPreview() {
            const urlInput = document.getElementById('urlInput');
            const frame = document.getElementById('previewFrame');
            frame.src = urlInput.value;
        }
        
        // Auto-refresh when URL input changes
        document.getElementById('urlInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                refreshPreview();
            }
        });
        
        // Handle iframe errors
        document.getElementById('previewFrame').addEventListener('error', function() {
            console.error('Failed to load preview URL');
        });
    </script>
</body>
</html>`;
}

function startTerminalWatcher() {
    // Monitor terminal output for server messages
    if (terminalWatcher) {
        terminalWatcher.dispose();
    }

    const config = vscode.workspace.getConfiguration('preview');
    const portRange = config.get('portRange', [3000, 3001, 4000, 5000, 8000, 8080, 8888, 9000]);

    // This is a simplified version - in practice, you'd need to hook into terminal output
    // For now, we'll just check for common server patterns
    terminalWatcher = vscode.window.onDidChangeActiveTerminal(() => {
        // Check for running servers on common ports
        checkForRunningServers(portRange);
    });
}

async function checkForRunningServers(ports: number[]) {
    // This is a placeholder - in a real implementation, you'd need to:
    // 1. Parse terminal output for server start messages
    // 2. Check if ports are actually listening
    // 3. Auto-open preview when detected
    
    // For demonstration, we'll just show a notification
    // when the terminal changes (you can extend this)
}

export function deactivate() {
    if (previewPanel) {
        previewPanel.dispose();
    }
    if (terminalWatcher) {
        terminalWatcher.dispose();
    }
}