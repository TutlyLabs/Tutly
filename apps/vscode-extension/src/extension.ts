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
      console.log('🔌 Testing connection to file server...');
      const response = await fetch('http://localhost:3001/api/health', {
        headers: { 'x-api-key': 'tutly-dev-key' }
      });
      
      if (response.ok) {
        this._connected = true;
        console.log('✅ Connected to file server');
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to connect to file server:', error);
      throw new Error('Unable to connect to Tutly file server. Make sure it\'s running on localhost:3001');
    } finally {
      this._connecting = false;
    }
  }

  async apiRequest(path: string = ''): Promise<ApiResponse> {
    await this.ensureConnected();
    
    const url = `http://localhost:3001/api/files${path ? `/${path}` : ''}`;
    console.log(`📡 API Request: ${url}`);
    
    const response = await fetch(url, {
      headers: { 'x-api-key': 'tutly-dev-key' }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
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
    console.log(`📁 readDirectory called for: ${uri.path}`);
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
    console.log(`📄 readFile called for: ${uri.path}`);
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
      
    } catch (error) {
      console.error('delete error:', error);
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
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
  
  watch(): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }
}

// Tree Data Provider for better loading control in Explorer
class TutlyTreeDataProvider implements vscode.TreeDataProvider<string | vscode.Uri> {
  private _onDidChangeTreeData = new vscode.EventEmitter<string | vscode.Uri | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private _isLoading = false;
  
  constructor(private provider: SimpleFileSystemProvider) {}

  refresh(): void {
    this._isLoading = true;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: string | vscode.Uri): vscode.TreeItem {
    if (typeof element === 'string') {
      if (element === 'loading') {
        const item = new vscode.TreeItem('🔄 Connecting to Tutly server...', vscode.TreeItemCollapsibleState.None);
        item.description = 'Please wait';
        item.iconPath = new vscode.ThemeIcon('loading~spin');
        return item;
      } else if (element === 'error') {
        const item = new vscode.TreeItem('❌ Connection failed', vscode.TreeItemCollapsibleState.None);
        item.description = 'Server not available';
        item.iconPath = new vscode.ThemeIcon('error');
        return item;
      } else if (element === 'refreshing') {
        const item = new vscode.TreeItem('🔄 Refreshing files...', vscode.TreeItemCollapsibleState.None);
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
        await this.provider.ensureConnected();
        this._isLoading = false;
        return [vscode.Uri.parse('tutly:/')];
      } catch (error) {
        this._isLoading = false;
        return ['error'];
      }
    }

    if (typeof element === 'string') {
      // Loading/error states don't have children
      return [];
    }

    try {
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

export async function activate(context: vscode.ExtensionContext) {
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
        const success = vscode.workspace.updateWorkspaceFolders(
          tutlyFolder.index, 1,
          { uri: tutlyFolder.uri, name: tutlyFolder.name }
        );
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
    } catch (error) {
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
    } else {
      vscode.window.showErrorMessage('❌ Failed to add workspace');
    }
  });
  context.subscriptions.push(openWorkspaceCommand);
  
  // Auto-connect and setup workspace
  try {
    console.log('🔌 Connecting to Tutly file server...');
    
    // Add workspace folder first (this makes it appear in the native explorer)
    const success = vscode.workspace.updateWorkspaceFolders(0, null, {
      uri: vscode.Uri.parse('tutly:/'),
      name: '📁 Tutly Files'
    });
    
    if (success) {
      console.log('✅ Workspace folder added successfully!');
      
      // Test connection in background
      provider.ensureConnected().then(() => {
        console.log('✅ Connected to file server');
        vscode.window.setStatusBarMessage('$(check) Tutly Files connected!', 3000);
        treeProvider.refresh(); // Refresh tree view to show connected state
      }).catch((error) => {
        console.error('❌ Connection failed:', error);
        vscode.window.setStatusBarMessage('$(error) Tutly server not available', 5000);
        treeProvider.refresh(); // Refresh to show error state
      });
      
    } else {
      throw new Error('Failed to add workspace folder');
    }
    
  } catch (error) {
    console.error('❌ Activation failed:', error);
    vscode.window.showErrorMessage(`Tutly Files: ${error}`);
  }
  
  console.log('✅ Extension activated successfully');
}

export function deactivate() {
  console.log('👋 Tutly File System extension deactivated');
}