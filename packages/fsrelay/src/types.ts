export interface GitContext {
  assignmentId: string;
  submissionId: string;
  type: 'TEMPLATE' | 'SUBMISSION';
}

export interface GitFileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string; // base64 encoded
  sha?: string;
}

export type FileSystemMode = 'gitfs' | 'fsrelay';

export interface ExtensionConfig {
  mode: FileSystemMode;
  assignmentId?: string;
  serverUrl?: string;
  apiKey?: string;
  tutlyConfig?: {
    version?: number;
    run?: {
      command: string;
      description?: string;
    };
    readonly?: string[];
  };
}

export type GitContentsResponse = GitFileEntry | GitFileEntry[];
