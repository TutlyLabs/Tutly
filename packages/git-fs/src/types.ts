export interface GitContext {
  assignmentId?: string;
  submissionId?: string;
  type: 'TEMPLATE' | 'SUBMISSION';
}

export interface GitFileEntry {
  name: string;
  type: 'file' | 'dir';
  path: string;
  size?: number;
  content?: string; // base64 encoded
  sha?: string;
}

export type GitContentsResponse = GitFileEntry | GitFileEntry[];
