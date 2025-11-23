import * as vscode from 'vscode';
import { GitFileSystemProvider } from './gitFileSystemProvider';
import { GitApiClient } from './apiClient';
import { GitContext } from './types';

let fileSystemProvider: GitFileSystemProvider | null = null;
let apiClient: GitApiClient | null = null;

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('tutlyfs');
  let assignmentId = config.get<string>('assignmentId');

  // Try to get from custom command if not in config
  if (!assignmentId) {
    try {
      assignmentId = await vscode.commands.executeCommand<string>('tutlyfs.getAssignmentId');
    } catch (e) {
    }
  }

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
          vscode.window.setStatusBarMessage('$(check) Tutly Environment Ready', 5000);
          vscode.commands.executeCommand('tutlyfs.onReady');
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
      vscode.window.setStatusBarMessage('$(check) Tutly Environment Ready', 5000);
      vscode.commands.executeCommand('tutlyfs.onReady');
    });
  }

  // Register Run Command
  context.subscriptions.push(
    vscode.commands.registerCommand('git-fs.run', () => {
      vscode.window.showInformationMessage('Run functionality is not implemented yet.');
    })
  );

  // Register Submit Command
  context.subscriptions.push(
    vscode.commands.registerCommand('git-fs.submit', () => {
      vscode.window.showInformationMessage('Submit functionality is not implemented yet.');
    })
  );
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

  // Create Status Bar Item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = `$(repo) Assignment: ${ctx.assignmentId}`;
  statusBarItem.tooltip = "Tutly Assignment Active";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

};


export function deactivate() {
  fileSystemProvider = null;
  apiClient = null;
}
