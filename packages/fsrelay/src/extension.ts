import * as vscode from 'vscode';

interface ApiResponse {
  entries?: Array<{ name: string; type: 'file' | 'directory' }>;
  content?: string;
  size?: number;
}

class SimpleFileSystemProvider implements vscode.FileSystemProvider {
  public _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;
  private _connected = false;
  private _connecting = false;

  async ensureConnected(): Promise<void> {
    if (this._connected) return;
    if (this._connecting) {
      // Wait for connection attempt to complete
      while (this._connecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this._connecting = true;
    try {
      console.log('Testing connection to file server...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('http://localhost:4242/api/health', {
        headers: { 'x-api-key': 'tutly-dev-key' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const health = await response.json();
        this._connected = true;
        console.log('Connected to file server', health);
      } else {
        throw new Error(`Server responded with ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to connect to file server:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Connection timeout - Make sure Tutly server is running on localhost:4242');
      }
      throw new Error(`Unable to connect to Tutly file server: ${error}`);
    } finally {
      this._connecting = false;
    }
  }

  async apiRequest(path: string = '', retryCount: number = 0): Promise<ApiResponse> {
    await this.ensureConnected();

    // Clean the path (remove leading/trailing slashes)
    const cleanPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
    const url = `http://localhost:4242/api/files${cleanPath ? `/${cleanPath}` : ''}`;
    console.log(`API Request (attempt ${retryCount + 1}): ${url}`);

    try {
      const response = await fetch(url, {
        headers: { 'x-api-key': 'tutly-dev-key' },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`File not found: ${path}`);
        } else if (response.status >= 500 && retryCount < 2) {
          // Retry server errors up to 2 times
          console.log(`Server error ${response.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.apiRequest(path, retryCount + 1);
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError' && retryCount < 2) {
        console.log('Request timeout, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.apiRequest(path, retryCount + 1);
      }
      throw error;
    }
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    console.log(`stat called for: ${uri.path}`);
    const path = uri.path.substring(1);

    try {
      const result = await this.apiRequest(path);

      if (result.entries) {
        // Directory
        return {
          type: vscode.FileType.Directory,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 0
        };
      } else {
        // File
        return {
          type: vscode.FileType.File,
          ctime: Date.now(),
          mtime: Date.now(),
          size: result.size || 0
        };
      }
    } catch (error) {
      console.error('stat error:', error);
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    console.log(`readDirectory called for: ${uri.path}`);
    const path = uri.path.substring(1);

    try {
      const result = await this.apiRequest(path);

      if (!result.entries) {
        throw new Error('Not a directory');
      }

      return result.entries.map((entry): [string, vscode.FileType] => [
        entry.name,
        entry.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
      ]);
    } catch (error) {
      console.error('readDirectory error:', error);
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    console.log(`readFile called for: ${uri.path}`);
    const path = uri.path.substring(1);

    try {
      const result = await this.apiRequest(path);

      if (result.content === undefined) {
        throw new Error('No file content');
      }

      return new TextEncoder().encode(result.content);
    } catch (error) {
      console.error('readFile error:', error);
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const path = uri.path.substring(1);

    try {
      // Check if file exists first
      const exists = await this.fileExists(uri);

      if (exists && !options.overwrite) {
        throw vscode.FileSystemError.FileExists(uri);
      }

      if (!exists && !options.create) {
        throw vscode.FileSystemError.FileNotFound(uri);
      }

      // Convert content to string (assuming text files for now)
      const textContent = new TextDecoder().decode(content);

      const url = `http://localhost:4242/api/files/${path}`;
      const response = await fetch(url, {
        method: exists ? 'PUT' : 'POST',
        headers: {
          'x-api-key': 'tutly-dev-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'file',
          content: textContent,
          binary: false
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // Fire change event
      this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);

    } catch (error) {
      console.error('writeFile error:', error);
      throw vscode.FileSystemError.Unavailable(uri);
    }
  }

  async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): Promise<void> {
    try {
      // Read content from old file
      const content = await this.readFile(oldUri);

      // Write to new location
      await this.writeFile(newUri, content, { create: true, overwrite: options.overwrite });

      // Delete old file
      await this.delete(oldUri, { recursive: false });

      // Fire change events
      this._emitter.fire([
        { type: vscode.FileChangeType.Deleted, uri: oldUri },
        { type: vscode.FileChangeType.Created, uri: newUri }
      ]);

    } catch (error) {
      console.error('rename error:', error);
      throw vscode.FileSystemError.Unavailable(oldUri);
    }
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean }): Promise<void> {
    const path = uri.path.substring(1);

    try {
      const url = `http://localhost:4242/api/files/${path}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'x-api-key': 'tutly-dev-key' }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // Fire change event
      this._emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);

    } catch (error) {
      console.error('delete error:', error);
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    const path = uri.path.substring(1);

    try {
      const url = `http://localhost:4242/api/files/${path}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': 'tutly-dev-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'directory'
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // Fire change event
      this._emitter.fire([{ type: vscode.FileChangeType.Created, uri }]);

    } catch (error) {
      console.error('createDirectory error:', error);
      throw vscode.FileSystemError.Unavailable(uri);
    }
  }

  private async fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await this.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  public resetConnection(): void {
    this._connected = false;
    this._connecting = false;
  }

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => { });
  }
}

function createTutlyPseudoterminal(): vscode.Pseudoterminal {
  // Create a WebSocket-based terminal for VS Code Web compatibility
  const writeEmitter = new vscode.EventEmitter<string>();
  const closeEmitter = new vscode.EventEmitter<number | void>();
  const nameEmitter = new vscode.EventEmitter<string>();

  let ws: WebSocket | null = null;
  let isConnected = false;

  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    onDidClose: closeEmitter.event,
    onDidChangeName: nameEmitter.event,

    open: (initialDimensions) => {
      // Connect to the CLI server's WebSocket terminal endpoint
      try {
        ws = new WebSocket('ws://localhost:4242/ws/terminal');

        ws.onopen = () => {
          isConnected = true;
          writeEmitter.fire('\x1b[32m🔗 Connected to Tutly Terminal Server\x1b[0m\r\n');
          writeEmitter.fire('\x1b[36mTutly Terminal - Ready for commands\x1b[0m\r\n');

          // Send initial resize if dimensions are available
          if (initialDimensions) {
            ws?.send(JSON.stringify({
              type: 'resize',
              cols: initialDimensions.columns,
              rows: initialDimensions.rows
            }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case 'connected':
                writeEmitter.fire(`\x1b[32m${message.message}\x1b[0m\r\n`);
                break;
              case 'data':
                writeEmitter.fire(message.data);
                break;
              case 'exit':
                writeEmitter.fire(`\x1b[33m📤 Terminal exited with code ${message.exitCode}\x1b[0m\r\n`);
                closeEmitter.fire(message.exitCode);
                break;
              case 'error':
                writeEmitter.fire(`\x1b[31mError: ${message.message}\x1b[0m\r\n`);
                break;
            }
          } catch (error) {
            writeEmitter.fire(`\x1b[31mFailed to parse server message\x1b[0m\r\n`);
          }
        };

        ws.onclose = () => {
          isConnected = false;
          writeEmitter.fire('\x1b[33mDisconnected from Tutly Terminal Server\x1b[0m\r\n');
        };

        ws.onerror = () => {
          isConnected = false;
          writeEmitter.fire('\x1b[31mFailed to connect to Tutly Terminal Server\x1b[0m\r\n');
          writeEmitter.fire('\x1b[33mMake sure the CLI server is running: tutly serve-files\x1b[0m\r\n');
        };

      } catch (error) {
        writeEmitter.fire('\x1b[31mWebSocket not supported or connection failed\x1b[0m\r\n');
        writeEmitter.fire('\x1b[33mFallback: Local terminal simulation mode\x1b[0m\r\n');
        writeEmitter.fire('\x1b[36mTutly Terminal (Local Mode) - Limited functionality\x1b[0m\r\n');
        writeEmitter.fire('$ ');
      }
    },

    close: () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    },

    handleInput: (data) => {
      if (ws && isConnected) {
        // Send input to the remote terminal
        ws.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      } else {
        // Fallback: echo input locally with basic simulation
        if (data === '\r') {
          writeEmitter.fire('\r\n$ ');
        } else if (data === '\x7f') { // backspace
          writeEmitter.fire('\b \b');
        } else if (data === '\x03') { // Ctrl+C
          writeEmitter.fire('^C\r\n$ ');
        } else {
          writeEmitter.fire(data);
        }
      }
    },

    setDimensions: (dimensions) => {
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: dimensions.columns,
          rows: dimensions.rows
        }));
      }
    }
  };

  return pty;
}

function createTutlyTerminal(): vscode.Terminal {
  const pty = createTutlyPseudoterminal();
  const terminal = vscode.window.createTerminal({
    name: `Tutly Terminal ${++terminalCounter}`,
    pty: pty
  });
  return terminal;
}

// Tree Data Provider for better loading control in Explorer
class TutlyTreeDataProvider implements vscode.TreeDataProvider<string | vscode.Uri> {
  private _onDidChangeTreeData = new vscode.EventEmitter<string | vscode.Uri | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private _isLoading = false;

  constructor(private provider: SimpleFileSystemProvider) { }

  refresh(): void {
    this._isLoading = true;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: string | vscode.Uri): vscode.TreeItem {
    if (typeof element === 'string') {
      if (element === 'loading') {
        const item = new vscode.TreeItem('Connecting to Tutly server...', vscode.TreeItemCollapsibleState.None);
        item.description = 'Please wait';
        item.iconPath = new vscode.ThemeIcon('loading~spin');
        return item;
      } else if (element === 'error') {
        const item = new vscode.TreeItem('Connection failed', vscode.TreeItemCollapsibleState.None);
        item.description = 'Server not available';
        item.iconPath = new vscode.ThemeIcon('error');
        return item;
      } else if (element === 'refreshing') {
        const item = new vscode.TreeItem('Refreshing files...', vscode.TreeItemCollapsibleState.None);
        item.description = 'Loading';
        item.iconPath = new vscode.ThemeIcon('loading~spin');
        return item;
      }
    }

    const uri = element as vscode.Uri;
    const item = new vscode.TreeItem(uri);
    item.resourceUri = uri;
    return item;
  }

  async getChildren(element?: string | vscode.Uri): Promise<(string | vscode.Uri)[]> {
    if (!element) {
      // Root level - check connection status
      if (this._isLoading) {
        return ['refreshing'];
      }

      try {
        // Add a small delay to avoid immediate requests on activation
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.provider.ensureConnected();
        this._isLoading = false;
        return [vscode.Uri.parse('tutly:/')];
      } catch (error) {
        console.error('TreeProvider connection failed:', error);
        this._isLoading = false;
        return ['error'];
      }
    }

    if (typeof element === 'string') {
      // Loading/error states don't have children
      return [];
    }

    try {
      // Add delay to reduce rapid requests
      await new Promise(resolve => setTimeout(resolve, 200));

      // This will show loading spinner automatically while promise is pending
      const entries = await this.provider.readDirectory(element);
      this._isLoading = false;
      return entries.map(([name, type]) => {
        const childUri = vscode.Uri.joinPath(element, name);
        return childUri;
      });
    } catch (error) {
      console.error('Failed to read directory:', error);
      this._isLoading = false;
      return [];
    }
  }
}

// Terminal counter for unique names
let terminalCounter = 0;

// Web-compatible terminal creation (no PTY required)

export async function activate(context: vscode.ExtensionContext) {
  console.log('Tutly File System extension starting...');

  // Create file system provider first
  const provider = new SimpleFileSystemProvider();

  // Register file system provider immediately (this enables tutly:// scheme)
  const fsDisposable = vscode.workspace.registerFileSystemProvider('tutly', provider, {
    isCaseSensitive: true, // Default to case-sensitive for web environment
    isReadonly: false
  });
  context.subscriptions.push(fsDisposable);

  // Create tree data provider for loading states in Explorer
  const treeProvider = new TutlyTreeDataProvider(provider);

  // Add commands
  const refreshCommand = vscode.commands.registerCommand('tutly.refresh', async () => {
    console.log('Refresh command triggered');
    treeProvider.refresh();

    // Also refresh the file system provider
    provider._emitter.fire([]);

    // Trigger a refresh of the workspace folders to update the native file explorer too
    const tutlyFolder = vscode.workspace.workspaceFolders?.find(f => f.uri.scheme === 'tutly');
    if (tutlyFolder) {
      // Force refresh by removing and re-adding (this ensures the native explorer updates)
      setTimeout(() => {
        const success = vscode.workspace.updateWorkspaceFolders(
          tutlyFolder.index, 1,
          { uri: tutlyFolder.uri, name: tutlyFolder.name }
        );
        if (success) {
          console.log('Workspace refreshed');
        }
      }, 100);
    }
  });
  context.subscriptions.push(refreshCommand);

  // Connect command
  const connectCommand = vscode.commands.registerCommand('tutly.connectToServer', async () => {
    try {
      await provider.ensureConnected();
      vscode.window.showInformationMessage('Connected to Tutly file server');
      treeProvider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Connection failed: ${error}`);
    }
  });
  context.subscriptions.push(connectCommand);

  // Open workspace command
  const openWorkspaceCommand = vscode.commands.registerCommand('tutly.openWorkspace', () => {
    const success = vscode.workspace.updateWorkspaceFolders(0, 0, {
      uri: vscode.Uri.parse('tutly:/'),
      name: 'Tutly Files'
    });

    if (success) {
      vscode.window.showInformationMessage('Tutly workspace added');
    } else {
      vscode.window.showErrorMessage('Failed to add workspace');
    }
  });
  context.subscriptions.push(openWorkspaceCommand);

  // Terminal command - creates and shows a new Tutly terminal
  const createTerminalCommand = vscode.commands.registerCommand('tutly.createTerminal', () => {
    try {
      const terminal = createTutlyTerminal();
      terminal.show();
      vscode.window.showInformationMessage(`Created ${terminal.name}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create terminal: ${error}`);
    }
  });
  context.subscriptions.push(createTerminalCommand);

  // Register a terminal profile provider to handle the "+" button and Ctrl+`
  const terminalProfileProvider = vscode.window.registerTerminalProfileProvider('tutly.terminal-profile', {
    provideTerminalProfile(token: vscode.CancellationToken): vscode.ProviderResult<vscode.TerminalProfile> {
      try {
        const pty = createTutlyPseudoterminal();
        return new vscode.TerminalProfile({
          name: `Tutly Terminal ${++terminalCounter}`,
          pty: pty
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create terminal profile: ${error}`);
        return undefined;
      }
    }
  });
  context.subscriptions.push(terminalProfileProvider);

  // Auto-connect and setup workspace with proper delays
  try {
    console.log('Initializing Tutly file server connection...');

    // Add workspace folder first (this makes it appear in the native explorer)
    const success = vscode.workspace.updateWorkspaceFolders(0, null, {
      uri: vscode.Uri.parse('tutly:/'),
      name: 'Tutly Files'
    });

    if (success) {
      console.log('Workspace folder added successfully!');

      // Wait a bit before trying to connect to give the server time to be ready
      setTimeout(async () => {
        try {
          console.log('Testing connection to file server...');
          await provider.ensureConnected();

          console.log('Connected to file server');
          vscode.window.setStatusBarMessage('$(check) Tutly Files connected!', 3000);
          treeProvider.refresh(); // Refresh tree view to show connected state

          // Automatically create and show terminal
          try {
            const terminal = createTutlyTerminal();
            terminal.show();
            console.log('Auto-created Tutly terminal');
            vscode.window.showInformationMessage('Tutly Files connected! Terminal ready.');
          } catch (termError) {
            console.error('Failed to create terminal:', termError);
            vscode.window.showErrorMessage(`Connected to files but failed to create terminal: ${termError}`);
          }

        } catch (error) {
          console.error('Connection failed:', error);
          vscode.window.setStatusBarMessage('$(error) Tutly server not available', 5000);
          treeProvider.refresh(); // Refresh to show error state

          vscode.window.showWarningMessage(
            'Tutly server not available. Make sure to run: tutly serve-files',
            'Retry Connection'
          ).then(result => {
            if (result === 'Retry Connection') {
              // Retry connection
              provider.resetConnection();
              provider.ensureConnected().then(() => {
                vscode.window.setStatusBarMessage('$(check) Tutly Files connected!', 3000);
                treeProvider.refresh();
              });
            }
          });
        }
      }, 1500); // Wait 1.5 seconds for server to be ready

    } else {
      throw new Error('Failed to add workspace folder');
    }

  } catch (error) {
    console.error('Activation failed:', error);
    vscode.window.showErrorMessage(`Tutly Files: ${error}`);
  }

  console.log('Extension activated successfully');

  // Activate Preview Extension
  try {
    const { activate: activatePreview } = await import('./preview');
    await activatePreview(context);
    console.log('Preview extension activated');
  } catch (error) {
    console.error('Failed to activate preview extension:', error);
  }

  // Activate Question Panel
  try {
    const questionPanel = require('./question-panel');
    if (questionPanel && questionPanel.activate) {
      await questionPanel.activate(context);
      console.log('Question panel activated');
    }
  } catch (error) {
    console.error('Failed to activate question panel:', error);
  }
}

export function deactivate() {
  console.log('Tutly File System extension deactivated');
}