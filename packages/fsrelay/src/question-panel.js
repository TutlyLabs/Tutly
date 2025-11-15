const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Tutly Question Panel extension is now active!');

  // Create the question panel provider
  const questionPanelProvider = new QuestionPanelProvider(context.extensionUri);

  // Register the webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('tutlyQuestionPanel', questionPanelProvider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );

  // Register the refresh command
  const refreshCommand = vscode.commands.registerCommand('tutlyQuestion.refresh', () => {
    questionPanelProvider.refresh();
  });

  context.subscriptions.push(refreshCommand);
}

class QuestionPanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = undefined;
  }

  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'alert':
            vscode.window.showInformationMessage(message.text);
            break;
        }
      }
    );
  }

  refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview();
    }
  }

  _getHtmlForWebview() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coding Question</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 16px;
            line-height: 1.6;
        }

        .question-container {
            max-width: 100%;
            margin: 0 auto;
        }

        .question-title {
            font-size: 1.2em;
            font-weight: 600;
            color: var(--vscode-textPreformat-foreground);
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .question-content {
            margin-bottom: 20px;
        }

        .question-content p {
            margin-bottom: 12px;
        }

        .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            margin: 16px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            overflow-x: auto;
        }

        .example {
            background-color: var(--vscode-editor-selectionBackground);
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding: 12px;
            margin: 16px 0;
            border-radius: 0 4px 4px 0;
        }

        .example-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }

        .constraints {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 12px;
            margin: 16px 0;
        }

        .constraints-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-textPreformat-foreground);
        }

        .constraints ul {
            margin: 0;
            padding-left: 20px;
        }

        .constraints li {
            margin-bottom: 4px;
        }

        .difficulty {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 600;
            margin-bottom: 16px;
        }

        .difficulty.medium {
            background-color: #f59e0b;
            color: #1f2937;
        }

        .refresh-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 0.9em;
            margin-top: 16px;
        }

        .refresh-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="question-container">
        <div class="difficulty medium">Medium</div>
        
        <h1 class="question-title">Two Sum</h1>
        
        <div class="question-content">
            <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>
            
            <p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>
            
            <p>You can return the answer in any order.</p>
        </div>

        <div class="example">
            <div class="example-title">Example 1:</div>
            <div class="code-block">
<strong>Input:</strong> nums = [2,7,11,15], target = 9
<strong>Output:</strong> [0,1]
<strong>Explanation:</strong> Because nums[0] + nums[1] == 9, we return [0, 1].
            </div>
        </div>

        <div class="example">
            <div class="example-title">Example 2:</div>
            <div class="code-block">
<strong>Input:</strong> nums = [3,2,4], target = 6
<strong>Output:</strong> [1,2]
            </div>
        </div>

        <div class="example">
            <div class="example-title">Example 3:</div>
            <div class="code-block">
<strong>Input:</strong> nums = [3,3], target = 6
<strong>Output:</strong> [0,1]
            </div>
        </div>

        <div class="constraints">
            <div class="constraints-title">Constraints:</div>
            <ul>
                <li>2 ≤ nums.length ≤ 10<sup>4</sup></li>
                <li>-10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup></li>
                <li>-10<sup>9</sup> ≤ target ≤ 10<sup>9</sup></li>
                <li><strong>Only one valid answer exists.</strong></li>
            </ul>
        </div>

        <button class="refresh-button" onclick="refreshQuestion()">Load New Question</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function refreshQuestion() {
            vscode.postMessage({
                command: 'alert',
                text: 'Question refresh functionality will be implemented later!'
            });
        }
    </script>
</body>
</html>`;
  }
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};