import { GitContext, GitContentsResponse } from '../types';

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

    const url = `/api/git-fs?${params.toString()}`;
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
}
