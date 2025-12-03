import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { minimatch } from 'minimatch';

interface ApiResponse {
  entries?: Array<{ name: string; type: 'file' | 'directory' }>;
  content?: string;
  size?: number;
}

export class FsRelayFileSystemProvider implements vscode.FileSystemProvider {
  public _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;
  private _connected = false;
  private _connecting = false;
  private serverUrl: string;
  private apiKey: string;

  private readonlyPatterns: string[] = [];

  constructor(serverUrl: string = 'http://localhost:4242', apiKey: string = 'tutly-dev-key', private isInstructor: boolean = false) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
  }

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

      const response = await fetch(`${this.serverUrl}/api/health`, {
        headers: { 'x-api-key': this.apiKey },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const health = await response.json();
        this._connected = true;
        console.log('Connected to file server', health);

        try {
          const configResponse = await fetch(`${this.serverUrl}/api/files/.tutly/config.yaml`, {
            headers: { 'x-api-key': this.apiKey }
          });
          if (configResponse.ok) {
            const data = await configResponse.json();
            if (data.content) {
              const configContent = data.content;
              const config = yaml.load(configContent) as any;
              if (config && Array.isArray(config.readonly)) {
                this.readonlyPatterns = config.readonly;
                console.log('Loaded readonly patterns:', this.readonlyPatterns);
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load .tutly/config.yaml:', e);
        }

      } else {
        throw new Error(`Server responded with ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to connect to file server:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Connection timeout - Make sure Tutly server is running on ${this.serverUrl}`);
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
    const url = `${this.serverUrl}/api/files${cleanPath ? `/${cleanPath}` : ''}`;
    console.log(`API Request (attempt ${retryCount + 1}): ${url}`);

    try {
      const response = await fetch(url, {
        headers: { 'x-api-key': this.apiKey },
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
        const stat: vscode.FileStat = {
          type: vscode.FileType.File,
          ctime: Date.now(),
          mtime: Date.now(),
          size: result.size || 0
        };

        // Always mark .tutly/workspace.json as readonly
        if (uri.path.endsWith('.tutly/workspace.json')) {
          stat.permissions = vscode.FilePermission.Readonly;
        }

        if (!this.isInstructor && this._isReadonly(uri.path)) {
          stat.permissions = vscode.FilePermission.Readonly;
        }

        return stat;
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

      const entries: [string, vscode.FileType][] = [];
      const dirPath = uri.path === '/' ? '' : uri.path;

      for (const entry of result.entries) {
        const childPath = dirPath ? `${dirPath}/${entry.name}` : `/${entry.name}`;

        if (!this.isInstructor && entry.name === '.tutly') {
          continue;
        }

        // If student, hide readonly files
        if (!this.isInstructor && entry.type !== 'directory' && this._isReadonly(childPath)) {
          continue;
        }

        entries.push([
          entry.name,
          entry.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
        ]);
      }

      return entries;
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
    if (!this.isInstructor && this._isReadonly(uri.path)) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    // Prevent students from editing .tutly/config.yaml
    if (!this.isInstructor && uri.path.endsWith('.tutly/config.yaml')) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    // Prevent anyone from editing .tutly/workspace.json
    if (uri.path.endsWith('.tutly/workspace.json')) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

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

      const url = `${this.serverUrl}/api/files/${path}`;
      const response = await fetch(url, {
        method: exists ? 'PUT' : 'POST',
        headers: {
          'x-api-key': this.apiKey,
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
    if (!this.isInstructor && this._isReadonly(oldUri.path)) {
      throw vscode.FileSystemError.NoPermissions(oldUri);
    }
    if (!this.isInstructor && this._isReadonly(newUri.path)) {
      throw vscode.FileSystemError.NoPermissions(newUri);
    }

    // Prevent renaming .tutly/workspace.json
    if (oldUri.path.endsWith('.tutly/workspace.json') || newUri.path.endsWith('.tutly/workspace.json')) {
      throw vscode.FileSystemError.NoPermissions(oldUri);
    }

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
    if (!this.isInstructor && this._isReadonly(uri.path)) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    // Prevent deleting .tutly/workspace.json
    if (uri.path.endsWith('.tutly/workspace.json')) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    const path = uri.path.substring(1);

    try {
      const url = `${this.serverUrl}/api/files/${path}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'x-api-key': this.apiKey }
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
    if (!this.isInstructor && this._isReadonly(uri.path)) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    const path = uri.path.substring(1);

    try {
      const url = `${this.serverUrl}/api/files/${path}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
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

  private _isReadonly(path: string): boolean {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

    for (const pattern of this.readonlyPatterns) {
      if (minimatch(normalizedPath, pattern)) {
        return true;
      }
    }
    return false;
  }
}
