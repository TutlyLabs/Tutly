import * as vscode from 'vscode';
import { GitFileSystemProvider } from './gitFileSystemProvider';
import { GitApiClient } from './apiClient';
import { GitContext } from './types';

let fileSystemProvider: GitFileSystemProvider | null = null;
let apiClient: GitApiClient | null = null;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('tutlyfs');
  let assignmentId = config.get<string>('assignmentId');

  // Prompt for assignmentId if not configured
  if (!assignmentId) {
    vscode.window.showInputBox({
      prompt: 'Enter Assignment ID',
      placeHolder: 'Assignment ID',
      ignoreFocusOut: true
    }).then(input => {
      if (input) {
        vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Setting up Tutly FS...",
          cancellable: false
        }, async () => {
          initializeFileSystem({ assignmentId: input, submissionId: '', type: 'TEMPLATE' }, context);
          await new Promise(resolve => setTimeout(resolve, 1500));
          vscode.window.showInformationMessage('Tutly FS Ready');
        });
      } else {
        vscode.window.showErrorMessage('Tutly FS: Assignment ID required');
      }
    });
  } else {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Setting up Tutly FS...",
      cancellable: false
    }, async () => {
      initializeFileSystem({ assignmentId: assignmentId!, submissionId: '', type: 'TEMPLATE' }, context);
      await new Promise(resolve => setTimeout(resolve, 1500));
      vscode.window.showInformationMessage('Tutly FS Ready');
    });
  }
}

const initializeFileSystem = (ctx: GitContext, context: vscode.ExtensionContext) => {
  apiClient = new GitApiClient();

  // Initialize file system provider
  fileSystemProvider = new GitFileSystemProvider(apiClient, ctx);

  // Register the file system provider
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('tutlyfs', fileSystemProvider, {
      isCaseSensitive: true,
      isReadonly: true,
    })
  );

  // Auto-open the workspace
  const workspaceUri = vscode.Uri.parse('tutlyfs:/');

  // Check if workspace is already open
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const isOpen = workspaceFolders?.some(
    folder => folder.uri.scheme === 'tutlyfs'
  );

  if (!isOpen) {
    vscode.workspace.updateWorkspaceFolders(0, 0, {
      uri: workspaceUri,
      name: `${ctx.assignmentId}`,
    });
  }


};


export function deactivate() {
  fileSystemProvider = null;
  apiClient = null;
}
