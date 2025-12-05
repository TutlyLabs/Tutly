import * as vscode from 'vscode';
import { GitApiClient } from './api';
import { GitContext, FileSystemMode, ExtensionConfig } from './types';
import { TutlyViewProvider } from './providers/webview';
import { MemFileSystemProvider } from './filesystems/memfs';
import { FsRelayFileSystemProvider } from './filesystems/fsrelay';
import { SourceControlProvider } from './providers/source-control';
import { createTutlyTerminal, createTutlyPseudoterminal, incrementTerminalCounter } from './providers/terminal';

let fileSystemProvider: MemFileSystemProvider | FsRelayFileSystemProvider | null = null;
let apiClient: GitApiClient | null = null;
let sourceControlProvider: SourceControlProvider | null = null;
let currentMode: FileSystemMode = 'gitfs';

export async function activate(context: vscode.ExtensionContext) {
  const runCommandInTerminal = (command: string) => {
    const serverUrl = config?.serverUrl || 'http://localhost:4242';
    const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const terminal = createTutlyTerminal(wsUrl);
    terminal.show();
    terminal.sendText(command);
  };

  const provider = new TutlyViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TutlyViewProvider.viewType, provider)
  );

  // Register TutlyFS commands globally
  context.subscriptions.push(
    vscode.commands.registerCommand('tutlyfs.run', async () => {
      await provider.triggerRunTests();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tutlyfs.submit', () => {
      runCommandInTerminal('tutly submit');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tutlyfs.save', async () => {
      runCommandInTerminal('tutly save');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tutlyfs.runTests', async () => {
      await provider.triggerRunTests();
    })
  );

  setTimeout(async () => {
    try {
      await vscode.commands.executeCommand('tutly.webview.focus');
    } catch (err) {
    }
  }, 1000);

  // Get configuration from the unified getConfig command
  let config: ExtensionConfig | undefined;
  try {
    config = await vscode.commands.executeCommand<ExtensionConfig>('tutlyfs.getConfig');
  } catch (err) {
    console.log('Failed to get config, using defaults');
  }

  // Default to fsrelay if not specified
  currentMode = config?.mode || 'fsrelay';

  if (currentMode === 'gitfs') {
    await activateGitFsMode(context, config);
  } else if (currentMode === 'fsrelay') {
    await activateFsRelayMode(context, config);
  }

  // Register mode switch command
  context.subscriptions.push(
    vscode.commands.registerCommand('tutly.switchMode', async () => {
      const newMode = await vscode.window.showQuickPick(['gitfs', 'fsrelay'], {
        placeHolder: 'Select filesystem mode'
      });

      if (newMode && (newMode === 'gitfs' || newMode === 'fsrelay')) {
        currentMode = newMode;
        vscode.window.showInformationMessage(`Switching to ${newMode} mode. Please reload the window.`, 'Reload')
          .then(selection => {
            if (selection === 'Reload') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
      }
    })
  );


  // Register terminal profile provider
  const terminalProfileProvider = vscode.window.registerTerminalProfileProvider('tutly.terminal-profile', {
    provideTerminalProfile(token: vscode.CancellationToken): vscode.ProviderResult<vscode.TerminalProfile> {
      try {
        const serverUrl = config?.serverUrl || 'http://localhost:4242';
        const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const pty = createTutlyPseudoterminal(wsUrl);
        return new vscode.TerminalProfile({
          name: `Tutly Terminal ${incrementTerminalCounter()}`,
          pty: pty
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create terminal profile: ${error}`);
        return undefined;
      }
    }
  });
  context.subscriptions.push(terminalProfileProvider);

  // Register Create Terminal Command
  context.subscriptions.push(
    vscode.commands.registerCommand('tutlyfs.createTerminal', () => {
      runCommandInTerminal(''); // Just opens the terminal
    })
  );

  // Create Status Bar Item for Terminal
  const terminalStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  terminalStatusBarItem.text = `$(terminal) Tutly Terminal`;
  terminalStatusBarItem.tooltip = "Open Tutly Terminal";
  terminalStatusBarItem.command = 'tutlyfs.createTerminal';
  terminalStatusBarItem.show();
  context.subscriptions.push(terminalStatusBarItem);
}

async function activateGitFsMode(context: vscode.ExtensionContext, config?: ExtensionConfig) {
  let assignmentId = config?.assignmentId;
  const isInstructor = config?.isInstructor || false;

  if (!assignmentId) {
    vscode.window.showInputBox({
      prompt: 'Enter Assignment ID',
      placeHolder: 'Assignment ID',
      ignoreFocusOut: true
    }).then(input => {
      if (input) {
        vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Setting up Tutly FS (GitFS Mode)...",
          cancellable: false
        }, async () => {
          initializeGitFileSystem({ assignmentId: input, submissionId: '', type: 'TEMPLATE' }, context, isInstructor);
          await new Promise(resolve => setTimeout(resolve, 1500));
          vscode.window.setStatusBarMessage('$(check) Tutly GitFS Ready', 5000);
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
      title: "Setting up Tutly FS (GitFS Mode)...",
      cancellable: false
    }, async () => {
      initializeGitFileSystem({ assignmentId: assignmentId!, submissionId: '', type: 'TEMPLATE' }, context, isInstructor);
      await new Promise(resolve => setTimeout(resolve, 1500));
      vscode.window.setStatusBarMessage('$(check) Tutly GitFS Ready', 5000);
      try {
        await vscode.commands.executeCommand('tutlyfs.onReady');
      } catch (err) {
      }
    });
  }

}

async function activateFsRelayMode(context: vscode.ExtensionContext, config?: ExtensionConfig) {
  const serverUrl = config?.serverUrl || 'http://localhost:4242';
  const apiKey = config?.apiKey || 'tutly-dev-key';
  const isInstructor = config?.isInstructor || false;

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Setting up Tutly File system...",
    cancellable: false
  }, async () => {
    await initializeFsRelayFileSystem(serverUrl, apiKey, context, isInstructor);
    await new Promise(resolve => setTimeout(resolve, 1500));
    vscode.window.setStatusBarMessage('$(check) Tutly File system Ready', 5000);
    try {
      await vscode.commands.executeCommand('tutlyfs.onReady');
    } catch (err) {
      console.log('Failed to trigger onReady:', err);
    }
  });

  // Register FsRelay-specific commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tutly.refresh', async () => {
      if (fileSystemProvider instanceof FsRelayFileSystemProvider) {
        fileSystemProvider._emitter.fire([]);
        vscode.window.showInformationMessage('Refreshed file system');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tutly.connectToServer', async () => {
      if (fileSystemProvider instanceof FsRelayFileSystemProvider) {
        try {
          await fileSystemProvider.ensureConnected();
          vscode.window.showInformationMessage('Connected to Tutly file server');
        } catch (error) {
          vscode.window.showErrorMessage(`Connection failed: ${error}`);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tutly.createTerminal', () => {
      try {
        const wsUrl = serverUrl!.replace('http://', 'ws://').replace('https://', 'wss://');
        const terminal = createTutlyTerminal(wsUrl);
        terminal.show();
        vscode.window.showInformationMessage(`Created ${terminal.name}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create terminal: ${error}`);
      }
    })
  );

}

const initializeGitFileSystem = async (ctx: GitContext, context: vscode.ExtensionContext, isInstructor: boolean) => {
  await closeAllTutlyEditors();

  apiClient = new GitApiClient();

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Cloning repository...",
    cancellable: false
  }, async () => {
    try {
      const archive = await apiClient!.getArchive(ctx);
      const memFs = new MemFileSystemProvider(apiClient!, ctx, isInstructor);
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

const initializeFsRelayFileSystem = async (serverUrl: string, apiKey: string, context: vscode.ExtensionContext, isInstructor: boolean) => {
  await closeAllTutlyEditors();

  const fsRelayProvider = new FsRelayFileSystemProvider(serverUrl, apiKey, isInstructor);

  try {
    await fsRelayProvider.ensureConnected();

    fileSystemProvider = fsRelayProvider;

    context.subscriptions.push(
      vscode.workspace.registerFileSystemProvider('tutlyfs', fileSystemProvider, {
        isCaseSensitive: true,
        isReadonly: false,
      })
    );

    // Setup workspace
    const workspaceUri = vscode.Uri.parse('tutlyfs:/');
    const success = vscode.workspace.updateWorkspaceFolders(0, 0, {
      uri: workspaceUri,
      name: 'Tutly Files',
    });

    if (success) {
      vscode.window.showInformationMessage('Tutly workspace is ready');
      // Auto-create terminal
      try {
        const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const terminal = createTutlyTerminal(wsUrl);
        terminal.show();
      } catch (error) {
        console.error('Failed to create terminal:', error);
      }
    }

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = `$(globe) FsRelay: Connected`;
    statusBarItem.tooltip = "Tutly FsRelay Active";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

  } catch (error) {
    vscode.window.showErrorMessage(`Failed to connect to server: ${error}`);
  }
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
