import * as vscode from 'vscode';
import { GitApiClient } from './api';
import { GitContext } from './types';
import { TutlyViewProvider } from './providers/webview';
import { MemFileSystemProvider } from './filesystems/memfs';
import { SourceControlProvider } from './providers/source-control';

let fileSystemProvider: MemFileSystemProvider | null = null;
let apiClient: GitApiClient | null = null;
let sourceControlProvider: SourceControlProvider | null = null;

export async function activate(context: vscode.ExtensionContext) {
  const provider = new TutlyViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TutlyViewProvider.viewType, provider)
  );

  setTimeout(async () => {
    try {
      await vscode.commands.executeCommand('tutly.webview.focus');
    } catch (err) {
    }
  }, 1000);

  let assignmentId: string | undefined;
  try {
    assignmentId = await vscode.commands.executeCommand<string>('tutlyfs.getAssignmentId');
  } catch (err) {
    assignmentId = undefined;
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
          try {
            await vscode.commands.executeCommand('tutlyfs.onReady');
          } catch (err) {
          }
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
      try {
        await vscode.commands.executeCommand('tutlyfs.onReady');
      } catch (err) {
        // noop
      }
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

  // Register Save Command
  context.subscriptions.push(
    vscode.commands.registerCommand('git-fs.save', async () => {
      if (!sourceControlProvider) {
        vscode.window.showErrorMessage('Source control not initialized');
        return;
      }

      const message = sourceControlProvider['sourceControl'].inputBox.value;
      try {
        await sourceControlProvider.commit(message);
      } catch (error) {
        // Error already shown in commit method
      }
    })
  );
}

const initializeFileSystem = async (ctx: GitContext, context: vscode.ExtensionContext) => {
  await closeAllTutlyEditors();

  apiClient = new GitApiClient();

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Cloning repository...",
    cancellable: false
  }, async () => {
    try {
      const archive = await apiClient!.getArchive(ctx);
      const memFs = new MemFileSystemProvider(apiClient!, ctx);
      await memFs.initialize(archive);

      // Create and set up source control provider
      sourceControlProvider = new SourceControlProvider(apiClient!, ctx);
      memFs.setSourceControlProvider(sourceControlProvider);
      context.subscriptions.push(sourceControlProvider);

      fileSystemProvider = memFs;

      context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider('tutlyfs', fileSystemProvider, {
          isCaseSensitive: true,
          isReadonly: false, // Writable (in-memory)
        })
      );

      setupWorkspace(ctx, context);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to clone repository: ${error}`);
    }
  });
};

const setupWorkspace = (ctx: GitContext, context: vscode.ExtensionContext) => {
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


async function closeAllTutlyEditors() {
  const tabGroups = vscode.window.tabGroups.all;
  for (const group of tabGroups) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        if (tab.input.uri.scheme === 'tutlyfs') {
          await vscode.window.tabGroups.close(tab);
        }
      }
    }
  }
}

export async function deactivate() {
  await closeAllTutlyEditors();

  fileSystemProvider = null;
  apiClient = null;
}
