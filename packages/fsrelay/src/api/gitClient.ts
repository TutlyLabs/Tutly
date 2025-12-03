import { GitContext, GitContentsResponse } from '../types';

export interface FileChange {
  path: string;
  content: string;
  status: 'modified' | 'added' | 'deleted';
}

export class GitApiClient {
  constructor() { }

  async getContents(
    context: GitContext,
    path: string
  ): Promise<GitContentsResponse> {
    const params = new URLSearchParams();
    params.set('operation', 'contents');
    params.set('path', path);
    params.set('ref', 'main');
    params.set('assignmentId', context.assignmentId || '');

    const url = `/api/fsrelay?${params.toString()}`;
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch contents: ${response.statusText}`);
    }

    return await response.json();
  }

  async getArchive(
    context: GitContext
  ): Promise<ArrayBuffer> {
    const params = new URLSearchParams();
    params.set('operation', 'archive');
    params.set('ref', 'main');
    params.set('assignmentId', context.assignmentId || '');

    const url = `/api/fsrelay?${params.toString()}`;
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch archive: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  async commitChanges(
    context: GitContext,
    files: FileChange[],
    message: string
  ): Promise<void> {
    const params = new URLSearchParams();
    params.set('operation', 'commit');
    params.set('assignmentId', context.assignmentId || '');

    const url = `/api/fsrelay?${params.toString()}`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files,
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to commit changes: ${error}`);
    }
  }
}
