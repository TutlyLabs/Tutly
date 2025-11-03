"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
class SimpleFileSystemProvider {
    constructor() {
        this._emitter = new vscode.EventEmitter();
        this.onDidChangeFile = this._emitter.event;
        this._connected = false;
        this._connecting = false;
    }
    async ensureConnected() {
        if (this._connected)
            return;
        if (this._connecting) {
            // Wait for connection attempt to complete
            while (this._connecting) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }
        this._connecting = true;
        try {
            console.log('🔌 Testing connection to file server...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            const response = await fetch('http://localhost:3001/api/health', {
                headers: { 'x-api-key': 'tutly-dev-key' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                const health = await response.json();
                this._connected = true;
                console.log('✅ Connected to file server', health);
            }
            else {
                throw new Error(`Server responded with ${response.status} ${response.statusText}`);
            }
        }
        catch (error) {
            console.error('❌ Failed to connect to file server:', error);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Connection timeout - Make sure Tutly server is running on localhost:3001');
            }
            throw new Error(`Unable to connect to Tutly file server: ${error}`);
        }
        finally {
            this._connecting = false;
        }
    }
    async apiRequest(path = '', retryCount = 0) {
        await this.ensureConnected();
        // Clean and encode the path properly
        const cleanPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
        const url = `http://localhost:3001/api/files${cleanPath ? `/${encodeURIComponent(cleanPath)}` : ''}`;
        console.log(`📡 API Request (attempt ${retryCount + 1}): ${url}`);
        try {
            const response = await fetch(url, {
                headers: { 'x-api-key': 'tutly-dev-key' },
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`File not found: ${path}`);
                }
                else if (response.status >= 500 && retryCount < 2) {
                    // Retry server errors up to 2 times
                    console.log(`Server error ${response.status}, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.apiRequest(path, retryCount + 1);
                }
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            if (error instanceof Error && error.name === 'TimeoutError' && retryCount < 2) {
                console.log('Request timeout, retrying...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.apiRequest(path, retryCount + 1);
            }
            throw error;
        }
    }
    async stat(uri) {
        console.log(`📊 stat called for: ${uri.path}`);
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
            }
            else {
                // File
                return {
                    type: vscode.FileType.File,
                    ctime: Date.now(),
                    mtime: Date.now(),
                    size: result.size || 0
                };
            }
        }
        catch (error) {
            console.error('stat error:', error);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }
    async readDirectory(uri) {
        console.log(`📁 readDirectory called for: ${uri.path}`);
        const path = uri.path.substring(1);
        try {
            const result = await this.apiRequest(path);
            if (!result.entries) {
                throw new Error('Not a directory');
            }
            return result.entries.map((entry) => [
                entry.name,
                entry.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
            ]);
        }
        catch (error) {
            console.error('readDirectory error:', error);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }
    async readFile(uri) {
        console.log(`📄 readFile called for: ${uri.path}`);
        const path = uri.path.substring(1);
        try {
            const result = await this.apiRequest(path);
            if (result.content === undefined) {
                throw new Error('No file content');
            }
            return new TextEncoder().encode(result.content);
        }
        catch (error) {
            console.error('readFile error:', error);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }
    async writeFile(uri, content, options) {
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
            const url = `http://localhost:3001/api/files/${path}`;
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
        }
        catch (error) {
            console.error('writeFile error:', error);
            throw vscode.FileSystemError.Unavailable(uri);
        }
    }
    async rename(oldUri, newUri, options) {
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
        }
        catch (error) {
            console.error('rename error:', error);
            throw vscode.FileSystemError.Unavailable(oldUri);
        }
    }
    async delete(uri, options) {
        const path = uri.path.substring(1);
        try {
            const url = `http://localhost:3001/api/files/${path}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'x-api-key': 'tutly-dev-key' }
            });
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            // Fire change event
            this._emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
        }
        catch (error) {
            console.error('delete error:', error);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }
    async createDirectory(uri) {
        const path = uri.path.substring(1);
        try {
            const url = `http://localhost:3001/api/files/${path}`;
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
        }
        catch (error) {
            console.error('createDirectory error:', error);
            throw vscode.FileSystemError.Unavailable(uri);
        }
    }
    async fileExists(uri) {
        try {
            await this.stat(uri);
            return true;
        }
        catch {
            return false;
        }
    }
    resetConnection() {
        this._connected = false;
        this._connecting = false;
    }
    watch() {
        return new vscode.Disposable(() => { });
    }
}
function createTutlyTerminal() {
    // Create a WebSocket-based terminal for VS Code Web compatibility
    const writeEmitter = new vscode.EventEmitter();
    const closeEmitter = new vscode.EventEmitter();
    const nameEmitter = new vscode.EventEmitter();
    let ws = null;
    let isConnected = false;
    let terminalName = `Tutly Terminal ${++terminalCounter}`;
    const pty = {
        onDidWrite: writeEmitter.event,
        onDidClose: closeEmitter.event,
        onDidChangeName: nameEmitter.event,
        open: (initialDimensions) => {
            // Connect to the CLI server's WebSocket terminal endpoint
            try {
                ws = new WebSocket('ws://localhost:3001/ws/terminal');
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
                                writeEmitter.fire(`\x1b[32m✅ ${message.message}\x1b[0m\r\n`);
                                break;
                            case 'data':
                                writeEmitter.fire(message.data);
                                break;
                            case 'exit':
                                writeEmitter.fire(`\x1b[33m📤 Terminal exited with code ${message.exitCode}\x1b[0m\r\n`);
                                closeEmitter.fire(message.exitCode);
                                break;
                            case 'error':
                                writeEmitter.fire(`\x1b[31m❌ Error: ${message.message}\x1b[0m\r\n`);
                                break;
                        }
                    }
                    catch (error) {
                        writeEmitter.fire(`\x1b[31m❌ Failed to parse server message\x1b[0m\r\n`);
                    }
                };
                ws.onclose = () => {
                    isConnected = false;
                    writeEmitter.fire('\x1b[33m🔌 Disconnected from Tutly Terminal Server\x1b[0m\r\n');
                };
                ws.onerror = () => {
                    isConnected = false;
                    writeEmitter.fire('\x1b[31m❌ Failed to connect to Tutly Terminal Server\x1b[0m\r\n');
                    writeEmitter.fire('\x1b[33mMake sure the CLI server is running: tutly serve-files\x1b[0m\r\n');
                };
            }
            catch (error) {
                writeEmitter.fire('\x1b[31m❌ WebSocket not supported or connection failed\x1b[0m\r\n');
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
            }
            else {
                // Fallback: echo input locally with basic simulation
                if (data === '\r') {
                    writeEmitter.fire('\r\n$ ');
                }
                else if (data === '\x7f') { // backspace
                    writeEmitter.fire('\b \b');
                }
                else if (data === '\x03') { // Ctrl+C
                    writeEmitter.fire('^C\r\n$ ');
                }
                else {
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
    const terminal = vscode.window.createTerminal({
        name: terminalName,
        pty: pty
    });
    return terminal;
}
// Tree Data Provider for better loading control in Explorer
class TutlyTreeDataProvider {
    constructor(provider) {
        this.provider = provider;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._isLoading = false;
    }
    refresh() {
        this._isLoading = true;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        if (typeof element === 'string') {
            if (element === 'loading') {
                const item = new vscode.TreeItem('🔄 Connecting to Tutly server...', vscode.TreeItemCollapsibleState.None);
                item.description = 'Please wait';
                item.iconPath = new vscode.ThemeIcon('loading~spin');
                return item;
            }
            else if (element === 'error') {
                const item = new vscode.TreeItem('❌ Connection failed', vscode.TreeItemCollapsibleState.None);
                item.description = 'Server not available';
                item.iconPath = new vscode.ThemeIcon('error');
                return item;
            }
            else if (element === 'refreshing') {
                const item = new vscode.TreeItem('🔄 Refreshing files...', vscode.TreeItemCollapsibleState.None);
                item.description = 'Loading';
                item.iconPath = new vscode.ThemeIcon('loading~spin');
                return item;
            }
        }
        const uri = element;
        const item = new vscode.TreeItem(uri);
        item.resourceUri = uri;
        return item;
    }
    async getChildren(element) {
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
            }
            catch (error) {
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
        }
        catch (error) {
            console.error('Failed to read directory:', error);
            this._isLoading = false;
            return [];
        }
    }
}
// Terminal counter for unique names
let terminalCounter = 0;
// Web-compatible terminal creation (no PTY required)
async function activate(context) {
    console.log('🚀 Tutly File System extension starting...');
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
    // Create a tree view for the Explorer (this shows loading indicators directly in Explorer)
    const treeView = vscode.window.createTreeView('tutlyExplorer', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);
    // Add commands
    const refreshCommand = vscode.commands.registerCommand('tutly.refresh', async () => {
        console.log('🔄 Refresh command triggered');
        treeProvider.refresh();
        // Also refresh the file system provider
        provider._emitter.fire([]);
        // Trigger a refresh of the workspace folders to update the native file explorer too
        const tutlyFolder = vscode.workspace.workspaceFolders?.find(f => f.uri.scheme === 'tutly');
        if (tutlyFolder) {
            // Force refresh by removing and re-adding (this ensures the native explorer updates)
            setTimeout(() => {
                const success = vscode.workspace.updateWorkspaceFolders(tutlyFolder.index, 1, { uri: tutlyFolder.uri, name: tutlyFolder.name });
                if (success) {
                    console.log('✅ Workspace refreshed');
                }
            }, 100);
        }
    });
    context.subscriptions.push(refreshCommand);
    // Connect command
    const connectCommand = vscode.commands.registerCommand('tutly.connectToServer', async () => {
        try {
            await provider.ensureConnected();
            vscode.window.showInformationMessage('✅ Connected to Tutly file server');
            treeProvider.refresh();
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Connection failed: ${error}`);
        }
    });
    context.subscriptions.push(connectCommand);
    // Open workspace command
    const openWorkspaceCommand = vscode.commands.registerCommand('tutly.openWorkspace', () => {
        const success = vscode.workspace.updateWorkspaceFolders(0, 0, {
            uri: vscode.Uri.parse('tutly:/'),
            name: '📁 Tutly Files'
        });
        if (success) {
            vscode.window.showInformationMessage('✅ Tutly workspace added');
        }
        else {
            vscode.window.showErrorMessage('❌ Failed to add workspace');
        }
    });
    context.subscriptions.push(openWorkspaceCommand);
    // Terminal command - creates and shows a new Tutly terminal
    const createTerminalCommand = vscode.commands.registerCommand('tutly.createTerminal', () => {
        try {
            const terminal = createTutlyTerminal();
            terminal.show();
            vscode.window.showInformationMessage(`Created ${terminal.name}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create terminal: ${error}`);
        }
    });
    context.subscriptions.push(createTerminalCommand);
    // Auto-connect and setup workspace with proper delays
    try {
        console.log('🔌 Initializing Tutly file server connection...');
        // Add workspace folder first (this makes it appear in the native explorer)
        const success = vscode.workspace.updateWorkspaceFolders(0, null, {
            uri: vscode.Uri.parse('tutly:/'),
            name: '📁 Tutly Files'
        });
        if (success) {
            console.log('✅ Workspace folder added successfully!');
            // Wait a bit before trying to connect to give the server time to be ready
            setTimeout(async () => {
                try {
                    console.log('🔌 Testing connection to file server...');
                    await provider.ensureConnected();
                    console.log('✅ Connected to file server');
                    vscode.window.setStatusBarMessage('$(check) Tutly Files connected!', 3000);
                    treeProvider.refresh(); // Refresh tree view to show connected state
                    // Show success notification with option to create terminal
                    const result = await vscode.window.showInformationMessage('✅ Tutly Files connected successfully!', 'Create Terminal', 'Dismiss');
                    if (result === 'Create Terminal') {
                        try {
                            const terminal = createTutlyTerminal();
                            terminal.show();
                            console.log('🖥️ Created Tutly terminal on user request');
                        }
                        catch (termError) {
                            console.error('❌ Failed to create terminal:', termError);
                            vscode.window.showErrorMessage(`Failed to create terminal: ${termError}`);
                        }
                    }
                }
                catch (error) {
                    console.error('❌ Connection failed:', error);
                    vscode.window.setStatusBarMessage('$(error) Tutly server not available', 5000);
                    treeProvider.refresh(); // Refresh to show error state
                    vscode.window.showWarningMessage('Tutly server not available. Make sure to run: tutly serve-files', 'Retry Connection').then(result => {
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
        }
        else {
            throw new Error('Failed to add workspace folder');
        }
    }
    catch (error) {
        console.error('❌ Activation failed:', error);
        vscode.window.showErrorMessage(`Tutly Files: ${error}`);
    }
    console.log('✅ Extension activated successfully');
}
function deactivate() {
    console.log('👋 Tutly File System extension deactivated');
}
