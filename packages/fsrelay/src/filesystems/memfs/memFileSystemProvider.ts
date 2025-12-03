import * as vscode from 'vscode';
import { GitApiClient } from '../../api';
import { GitContext } from '../../types';
import * as JSZip from 'jszip';
import * as yaml from 'js-yaml';
import { minimatch } from 'minimatch';
import { SourceControlProvider } from '../../providers/source-control/sourceControlProvider';

interface MemFile {
  type: vscode.FileType.File;
  ctime: number;
  mtime: number;
  size: number;
  content?: Uint8Array;
  sha?: string; // Git SHA for lazy loading
  originalContent?: Uint8Array; // Track original content for change detection
}

interface MemDirectory {
  type: vscode.FileType.Directory;
  ctime: number;
  mtime: number;
  size: number;
  entries: Map<string, MemFile | MemDirectory>;
}

type MemEntry = MemFile | MemDirectory;

export class MemFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

  private root: MemDirectory = {
    type: vscode.FileType.Directory,
    ctime: Date.now(),
    mtime: Date.now(),
    size: 0,
    entries: new Map(),
  };

  private sourceControlProvider?: SourceControlProvider;

  constructor(private apiClient: GitApiClient, private context: GitContext, private isInstructor: boolean) { }

  /**
   * Set the source control provider for tracking changes
   */
  setSourceControlProvider(provider: SourceControlProvider) {
    this.sourceControlProvider = provider;
  }

  private readonlyPatterns: string[] = [];

  /**
   * Initialize the file system with a git archive (zip)
   */
  async initialize(archiveBuffer: ArrayBuffer) {
    this.root.entries.clear();
    this.readonlyPatterns = [];
    const zip = await JSZip.loadAsync(archiveBuffer);

    // Try to load .tutly/config.yaml
    const configEntry = zip.file('.tutly/config.yaml');
    if (configEntry) {
      try {
        const configContent = await configEntry.async('string');
        const config = yaml.load(configContent) as any;
        if (config && Array.isArray(config.readonly)) {
          this.readonlyPatterns = config.readonly;
          console.log('Loaded readonly patterns:', this.readonlyPatterns);
        }
      } catch (error) {
        console.error('Failed to load .tutly/config.yaml:', error);
      }
    }

    // Filter out directories (they end with /) and process files
    const files = Object.keys(zip.files).filter(name => !zip.files[name].dir);

    for (const filename of files) {
      const file = zip.files[filename];
      const content = await file.async('uint8array');

      // Create directory structure
      // Gitea archives usually are `repo-name/file
      const parts = filename.split('/');
      if (parts.length > 1) {
        parts.shift(); // Remove root folder
      }

      if (parts.length === 0) continue; // It was just the root folder

      const name = parts.pop()!;
      let currentDir = this.root;

      for (const part of parts) {
        let dir = currentDir.entries.get(part);
        if (!dir || dir.type !== vscode.FileType.Directory) {
          dir = {
            type: vscode.FileType.Directory,
            ctime: Date.now(),
            mtime: Date.now(),
            size: 0,
            entries: new Map(),
          };
          currentDir.entries.set(part, dir);
        }
        currentDir = dir;
      }

      // Create file entry with original content stored
      currentDir.entries.set(name, {
        type: vscode.FileType.File,
        ctime: file.date.getTime(),
        mtime: file.date.getTime(),
        size: content.byteLength,
        content: content,
        originalContent: content // Store original for change tracking
      });
    }
  }

  // --- File System Operations ---

  watch(uri: vscode.Uri): vscode.Disposable {
    return new vscode.Disposable(() => { });
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const entry = this._lookup(uri, false);
    const stat: vscode.FileStat = {
      type: entry.type,
      ctime: entry.ctime,
      mtime: entry.mtime,
      size: entry.size,
    };

    if (uri.path.endsWith('.tutly/workspace.json')) {
      stat.permissions = vscode.FilePermission.Readonly;
    }

    if (!this.isInstructor && entry.type === vscode.FileType.File && this._isReadonly(uri.path)) {
      stat.permissions = vscode.FilePermission.Readonly;
    }

    return stat;
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    const entry = this._lookupAsDirectory(uri, false);
    const result: [string, vscode.FileType][] = [];

    // Get the directory path relative to root
    const dirPath = uri.path === '/' ? '' : uri.path;

    for (const [name, child] of entry.entries) {
      // Construct full path for the child
      const childPath = dirPath ? `${dirPath}/${name}` : `/${name}`;

      // If student, hide .tutly folder
      if (!this.isInstructor && name === '.tutly') {
        continue;
      }

      // If student, hide readonly files
      if (!this.isInstructor && child.type === vscode.FileType.File && this._isReadonly(childPath)) {
        continue;
      }

      result.push([name, child.type]);
    }
    return result;
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const entry = this._lookupAsFile(uri, false);
    return entry.content || new Uint8Array(0);
  }

  writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): void {
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

    const basename = this._basename(uri.path);
    const parent = this._lookupParentDirectory(uri);
    let entry = parent.entries.get(basename);

    if (entry instanceof Object && entry.type === vscode.FileType.Directory) {
      throw vscode.FileSystemError.FileIsADirectory(uri);
    }

    if (!entry && !options.create) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    if (entry && options.create && !options.overwrite) {
      throw vscode.FileSystemError.FileExists(uri);
    }

    const isNewFile = !entry;

    if (!entry) {
      // New file
      entry = {
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: content.byteLength,
        content: content,
        originalContent: undefined, // No original content for new files
      };
      parent.entries.set(basename, entry);
      this._fireSoon({ type: vscode.FileChangeType.Created, uri });

      // Track as added in source control
      if (this.sourceControlProvider) {
        this.sourceControlProvider.trackChange(uri.path, content, 'added');
      }
    } else {
      // Modified file
      const oldContent = entry.content;
      entry.mtime = Date.now();
      entry.size = content.byteLength;
      entry.content = content;
      this._fireSoon({ type: vscode.FileChangeType.Changed, uri });

      // Track as modified in source control if content actually changed
      if (this.sourceControlProvider && oldContent) {
        const contentChanged = !this._areEqual(oldContent, content);
        if (contentChanged) {
          // Check if it's different from original
          const originalContent = entry.originalContent;
          if (originalContent && this._areEqual(originalContent, content)) {
            // Content is back to original, untrack
            this.sourceControlProvider.untrackChange(uri.path);
          } else {
            // Content is different from original
            this.sourceControlProvider.trackChange(uri.path, content, 'modified');
          }
        }
      }
    }
  }

  private _areEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.byteLength !== b.byteLength) return false;
    for (let i = 0; i < a.byteLength; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
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

    if (!options.overwrite && this._lookup(newUri, true)) {
      throw vscode.FileSystemError.FileExists(newUri);
    }

    const entry = this._lookup(oldUri, false);
    const oldParent = this._lookupParentDirectory(oldUri);

    const newParent = this._lookupParentDirectory(newUri);
    const newName = this._basename(newUri.path);

    oldParent.entries.delete(this._basename(oldUri.path));
    newParent.entries.set(newName, entry);

    this._fireSoon(
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri }
    );

    // Track in source control as delete + add
    if (this.sourceControlProvider) {
      this.sourceControlProvider.untrackChange(oldUri.path);
      if (entry.type === vscode.FileType.File && 'content' in entry && entry.content) {
        this.sourceControlProvider.trackChange(newUri.path, entry.content, 'added');
      }
    }
  }

  delete(uri: vscode.Uri): void {
    if (!this.isInstructor && this._isReadonly(uri.path)) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    const dirname = uri.with({ path: this._dirname(uri.path) });
    const basename = this._basename(uri.path);
    const parent = this._lookupAsDirectory(dirname, false);
    if (!parent.entries.has(basename)) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    // Get the entry before deleting to check if it had original content
    const entry = parent.entries.get(basename);
    const hadOriginalContent = entry && entry.type === vscode.FileType.File && 'originalContent' in entry && entry.originalContent;

    parent.entries.delete(basename);
    this._fireSoon({ type: vscode.FileChangeType.Deleted, uri });

    // Track deletion in source control only if the file existed in the original repo
    if (this.sourceControlProvider && hadOriginalContent) {
      // For deleted files, we don't need content, just mark as deleted
      this.sourceControlProvider.trackChange(uri.path, new Uint8Array(), 'deleted');
    }
  }

  createDirectory(uri: vscode.Uri): void {
    if (!this.isInstructor && this._isReadonly(uri.path)) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    const basename = this._basename(uri.path);
    const dirname = uri.with({ path: this._dirname(uri.path) });
    const parent = this._lookupAsDirectory(dirname, false);

    const entry: MemDirectory = {
      type: vscode.FileType.Directory,
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0,
      entries: new Map(),
    };

    parent.entries.set(basename, entry);
    this._fireSoon({ type: vscode.FileChangeType.Created, uri });
  }

  // --- Helpers ---

  private _isReadonly(path: string): boolean {
    // Normalize path to remove leading slash
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

    for (const pattern of this.readonlyPatterns) {
      if (minimatch(normalizedPath, pattern)) {
        return true;
      }
    }
    return false;
  }

  private _basename(path: string): string {
    path = this._trim(path);
    const i = path.lastIndexOf('/');
    return i === -1 ? path : path.slice(i + 1);
  }

  private _dirname(path: string): string {
    path = this._trim(path);
    const i = path.lastIndexOf('/');
    return i === -1 ? '' : path.slice(0, i);
  }

  private _trim(path: string): string {
    return path.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private _lookup(uri: vscode.Uri, silent: false): MemEntry;
  private _lookup(uri: vscode.Uri, silent: boolean): MemEntry | undefined;
  private _lookup(uri: vscode.Uri, silent: boolean): MemEntry | undefined {
    const parts = uri.path.split('/');
    let entry: MemEntry = this.root;
    for (const part of parts) {
      if (!part) {
        continue;
      }
      let child: MemEntry | undefined;
      if (entry instanceof Object && entry.type === vscode.FileType.Directory) {
        child = entry.entries.get(part);
      }
      if (!child) {
        if (!silent) {
          throw vscode.FileSystemError.FileNotFound(uri);
        } else {
          return undefined;
        }
      }
      entry = child;
    }
    return entry;
  }

  private _lookupAsDirectory(uri: vscode.Uri, silent: boolean): MemDirectory {
    const entry = this._lookup(uri, silent);
    if (entry instanceof Object && entry.type === vscode.FileType.Directory) {
      return entry;
    }
    throw vscode.FileSystemError.FileNotADirectory(uri);
  }

  private _lookupAsFile(uri: vscode.Uri, silent: boolean): MemFile {
    const entry = this._lookup(uri, silent);
    if (entry instanceof Object && entry.type === vscode.FileType.File) {
      return entry;
    }
    throw vscode.FileSystemError.FileIsADirectory(uri);
  }

  private _lookupParentDirectory(uri: vscode.Uri): MemDirectory {
    const dirname = uri.with({ path: this._dirname(uri.path) });
    return this._lookupAsDirectory(dirname, false);
  }

  private _fireSoon(...events: vscode.FileChangeEvent[]): void {
    this._emitter.fire(events);
  }
}
