let previewPanel;
let statusBarItem;
let terminalWatcher;

function activate(context) {
  console.log('Preview Extension is now active!');

  // Import vscode API
  const vscode = require('vscode');

  // Create prominent status bar item (title bar style)
  const config = vscode.workspace.getConfiguration('preview');
  const position = config.get('statusBarPosition', 'right') === 'right' ?
    vscode.StatusBarAlignment.Right : vscode.StatusBarAlignment.Left;
  const showTitle = config.get('showTitle', true);

  statusBarItem = vscode.window.createStatusBarItem('preview.toggle', position, 1000);
  statusBarItem.text = showTitle ? "$(open-preview) Preview" : "$(open-preview)";
  statusBarItem.command = 'preview.toggle';
  statusBarItem.tooltip = 'Toggle Preview - Open/close preview panel';
  statusBarItem.backgroundColor = undefined; // Use default theme colors
  statusBarItem.show();

  // Register commands
  const togglePreviewDisposable = vscode.commands.registerCommand('preview.toggle', () => {
    togglePreview(vscode);
    updateStatusBarItem(vscode);
  });

  const openPreviewDisposable = vscode.commands.registerCommand('preview.open', () => {
    openPreview(vscode);
    updateStatusBarItem(vscode);
  });

  const openInBrowserDisposable = vscode.commands.registerCommand('preview.openInBrowser', () => {
    openInBrowser(vscode);
  });

  // Watch for terminal output to detect running servers
  if (config.get('autoDetect')) {
    startTerminalWatcher(vscode);
  }

  // Watch for configuration changes
  const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('preview')) {
      updateStatusBarItem(vscode);
    }
  });

  context.subscriptions.push(
    togglePreviewDisposable,
    openPreviewDisposable,
    openInBrowserDisposable,
    statusBarItem,
    configWatcher
  );
}

function togglePreview(vscode) {
  if (previewPanel) {
    previewPanel.dispose();
    previewPanel = undefined;
  } else {
    openPreview(vscode);
  }
}

function updateStatusBarItem(vscode) {
  const config = vscode.workspace.getConfiguration('preview');
  const showTitle = config.get('showTitle', true);

  if (previewPanel) {
    statusBarItem.text = showTitle ? "$(close) Preview" : "$(close)";
    statusBarItem.tooltip = 'Close Preview Panel';
  } else {
    statusBarItem.text = showTitle ? "$(open-preview) Preview" : "$(open-preview)";
    statusBarItem.tooltip = 'Open Preview Panel';
  }
}

function openInBrowser(vscode) {
  const config = vscode.workspace.getConfiguration('preview');
  const defaultPort = config.get('defaultPort', 3000);
  const previewUrl = `http://localhost:${defaultPort}`;

  vscode.env.openExternal(vscode.Uri.parse(previewUrl));

  vscode.window.showInformationMessage(`Opening ${previewUrl} in external browser`);
}

function openPreview(vscode, url) {
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
    updateStatusBarItem(vscode);
  });

  // Add refresh functionality
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

function getWebviewContent(url) {
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
        <button class="refresh-btn" onclick="refreshPreview()">🔄 Refresh</button>
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

function startTerminalWatcher(vscode) {
  // Monitor terminal output for server messages
  if (terminalWatcher) {
    terminalWatcher.dispose();
  }

  const config = vscode.workspace.getConfiguration('preview');
  const portRange = config.get('portRange', [3000, 3001, 4000, 5000, 8000, 8080, 8888, 9000]);

  // This is a simplified version - monitor terminal changes
  terminalWatcher = vscode.window.onDidChangeActiveTerminal(() => {
    // Check for running servers on common ports
    checkForRunningServers(vscode, portRange);
  });
}

async function checkForRunningServers(vscode, ports) {
  // This is a placeholder for server detection
  // In a real implementation, you'd parse terminal output
  // and check for server start messages

  // For now, just show that the watcher is active
  console.log('Watching for servers on ports:', ports);
}

function deactivate() {
  if (previewPanel) {
    previewPanel.dispose();
  }
  if (terminalWatcher) {
    terminalWatcher.dispose();
  }
}

module.exports = {
  activate,
  deactivate
};