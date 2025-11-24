import * as vscode from 'vscode';
import { GitApiClient, FileChange } from './api';
import { GitContext } from './types';

export class SourceControlProvider {
  private sourceControl: vscode.SourceControl;
  private changesGroup: vscode.SourceControlResourceGroup;
  private changes: Map<string, FileChange> = new Map();

  constructor(
    private apiClient: GitApiClient,
    private context: GitContext
  ) {
    // Create source control instance
    this.sourceControl = vscode.scm.createSourceControl(
      'tutlyfs-git',
      'Tutly Git',
      vscode.Uri.parse('tutlyfs:/')
    );

    // Create resource group for changes
    this.changesGroup = this.sourceControl.createResourceGroup(
      'changes',
      'Changes'
    );

    // Set up input box for commit messages
    this.sourceControl.inputBox.placeholder = 'Message (Ctrl+Enter to commit)';
    this.sourceControl.acceptInputCommand = {
      command: 'git-fs.save',
      title: 'Commit',
    };
  }

  /**
   * Track a file change
   */
  trackChange(path: string, content: Uint8Array, status: 'modified' | 'added' | 'deleted') {
    // Normalize path: remove leading slash
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const contentStr = new TextDecoder().decode(content);
    this.changes.set(normalizedPath, { path: normalizedPath, content: contentStr, status });
    this.updateSourceControl();
  }

  /**
   * Remove a tracked change
   */
  untrackChange(path: string) {
    // Normalize path: remove leading slash
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    this.changes.delete(normalizedPath);
    this.updateSourceControl();
  }

  /**
   * Get all tracked changes
   */
  getChanges(): FileChange[] {
    return Array.from(this.changes.values());
  }

  /**
   * Clear all tracked changes
   */
  clearChanges() {
    this.changes.clear();
    this.updateSourceControl();
  }

  /**
   * Update the source control view with current changes
   */
  private updateSourceControl() {
    const resourceStates: vscode.SourceControlResourceState[] = [];

    for (const change of this.changes.values()) {
      const uri = vscode.Uri.parse(`tutlyfs:/${change.path}`);

      let decorations: vscode.SourceControlResourceDecorations | undefined;
      if (change.status === 'modified') {
        decorations = {
          strikeThrough: false,
          faded: false,
          tooltip: 'Modified',
          iconPath: new vscode.ThemeIcon('diff-modified', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'))
        };
      } else if (change.status === 'added') {
        decorations = {
          strikeThrough: false,
          faded: false,
          tooltip: 'Added',
          iconPath: new vscode.ThemeIcon('diff-added', new vscode.ThemeColor('gitDecoration.addedResourceForeground'))
        };
      } else if (change.status === 'deleted') {
        decorations = {
          strikeThrough: true,
          faded: true,
          tooltip: 'Deleted',
          iconPath: new vscode.ThemeIcon('diff-removed', new vscode.ThemeColor('gitDecoration.deletedResourceForeground'))
        };
      }

      resourceStates.push({
        resourceUri: uri,
        decorations,
      });
    }

    this.changesGroup.resourceStates = resourceStates;
  }

  /**
   * Commit all changes
   */
  async commit(message: string): Promise<void> {
    if (this.changes.size === 0) {
      vscode.window.showInformationMessage('No changes to commit');
      return;
    }

    if (!message || message.trim() === '') {
      vscode.window.showErrorMessage('Please provide a commit message');
      return;
    }

    try {
      const changes = this.getChanges();
      await this.apiClient.commitChanges(this.context, changes, message);

      // Clear changes after successful commit
      this.clearChanges();
      this.sourceControl.inputBox.value = '';

      vscode.window.showInformationMessage(`Successfully committed ${changes.length} file(s)`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to commit: ${error}`);
      throw error;
    }
  }

  dispose() {
    this.sourceControl.dispose();
  }
}
