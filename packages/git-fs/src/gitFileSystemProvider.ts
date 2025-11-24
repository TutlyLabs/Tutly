import * as vscode from 'vscode';
import { GitApiClient } from './api';
import { GitContext, GitFileEntry } from './types';
import { Buffer } from 'buffer';

export class GitFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

  private apiClient: GitApiClient;
  private context: GitContext;

  // Cache for performance
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(apiClient: GitApiClient, context: GitContext) {
    this.apiClient = apiClient;
    this.context = context;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Refresh the file system for a given URI
   */
  refresh(uri: vscode.Uri): void {
    this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  /**
   * Get from cache or fetch
   */
  private async getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Parse URI to get the file path
   */
  private getPath(uri: vscode.Uri): string {
    // URI format: tutlyfs:/path/to/file
    return uri.path.startsWith('/') ? uri.path.slice(1) : uri.path;
  }

  /**
   * Watch for file changes (no-op for read-only FS)
   */
  watch(): vscode.Disposable {
    return new vscode.Disposable(() => { });
  }

  /**
   * Get file or directory stats
   */
  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const path = this.getPath(uri);

    try {
      const contents = await this.getCached(
        `contents:${path}`,
        () => this.apiClient.getContents(this.context, path)
      );

      // If it's an array, it's a directory
      if (Array.isArray(contents)) {
        return {
          type: vscode.FileType.Directory,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 0,
        };
      }

      // It's a file
      return {
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: contents.size || 0,
      };
    } catch (error) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  /**
   * Read directory contents
   */
  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const path = this.getPath(uri);

    try {
      const contents = await this.getCached(
        `contents:${path}`,
        () => this.apiClient.getContents(this.context, path)
      );

      if (!Array.isArray(contents)) {
        throw vscode.FileSystemError.FileNotADirectory(uri);
      }

      return contents.map((entry: GitFileEntry) => {
        const type = entry.type === 'dir'
          ? vscode.FileType.Directory
          : vscode.FileType.File;
        return [entry.name, type];
      });
    } catch (error) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  /**
   * Read file contents
   */
  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const path = this.getPath(uri);

    try {
      const contents = await this.getCached(
        `file:${path}`,
        () => this.apiClient.getContents(this.context, path)
      );

      if (Array.isArray(contents)) {
        throw vscode.FileSystemError.FileIsADirectory(uri);
      }

      // Decode base64 content
      if (!contents.content) {
        return new Uint8Array(0);
      }

      // Remove any whitespace from base64 string
      const base64 = contents.content.replace(/\s/g, '');
      const buffer = Buffer.from(base64, 'base64');
      return new Uint8Array(buffer);
    } catch (error) {
      console.error('Error reading file:', error);
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  // Read-only file system - throw errors for write operations
  writeFile(): void {
    throw vscode.FileSystemError.NoPermissions('Git file system is read-only');
  }

  rename(): void {
    throw vscode.FileSystemError.NoPermissions('Git file system is read-only');
  }

  delete(): void {
    throw vscode.FileSystemError.NoPermissions('Git file system is read-only');
  }

  createDirectory(): void {
    throw vscode.FileSystemError.NoPermissions('Git file system is read-only');
  }
}
