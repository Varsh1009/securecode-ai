import * as vscode from 'vscode';
import { AnalyzerClient } from './analyzer';
import { DiagnosticManager } from './diagnostics';
import { QuickFixProvider } from './quickFix';

let analyzerClient: AnalyzerClient;
let diagnosticManager: DiagnosticManager;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('SecureCode AI is now active!');

    // Initialize components
    const config = vscode.workspace.getConfiguration('securecode');
    const apiUrl = config.get<string>('apiUrl', 'http://localhost:8001');
    
    analyzerClient = new AnalyzerClient(apiUrl);
    diagnosticManager = new DiagnosticManager();

    // Create status bar item with click action
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = "$(shield) SecureCode";
    statusBarItem.tooltip = "SecureCode AI: Ready - Click to scan";
    statusBarItem.command = 'securecode.scanFile';
    statusBarItem.show();

    // Register Quick Fix providers
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file', language: 'python' },
            new QuickFixProvider(),
            {
                providedCodeActionKinds: QuickFixProvider.providedCodeActionKinds
            }
        )
    );

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file', language: 'javascript' },
            new QuickFixProvider(),
            {
                providedCodeActionKinds: QuickFixProvider.providedCodeActionKinds
            }
        )
    );

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file', language: 'typescript' },
            new QuickFixProvider(),
            {
                providedCodeActionKinds: QuickFixProvider.providedCodeActionKinds
            }
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('securecode.scanFile', () => scanCurrentFile())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('securecode.scanProject', () => scanProject())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('securecode.clearDiagnostics', () => {
            diagnosticManager.clear();
            vscode.window.showInformationMessage('SecureCode: Cleared all warnings');
        })
    );

    // Register ignore command
    context.subscriptions.push(
        vscode.commands.registerCommand('securecode.ignoreWarning', (diagnostic: vscode.Diagnostic) => {
            vscode.window.showInformationMessage(`Ignored: ${diagnostic.message}`);
            // In a real app, you'd store this in workspace state
        })
    );

    // Show statistics command
    context.subscriptions.push(
        vscode.commands.registerCommand('securecode.showStats', async () => {
            try {
                const axios = require('axios');
                const response = await axios.get(`${apiUrl}/api/analyze/scans?limit=10`);
                const stats = response.data;
                
                const scansList = stats.scans.slice(0, 5).map((s: any, i: number) => 
                    `${i + 1}. ${s.scan_type} - ${s.total_vulnerabilities} issues (${s.status})`
                ).join('\n');

                const message = `📊 SecureCode AI Statistics

Total Scans: ${stats.total}
Recent Scans: ${stats.scans.length}

Last 5 Scans:
${scansList || 'No scans yet'}`;
                
                vscode.window.showInformationMessage(message, { modal: true });
            } catch (error) {
                vscode.window.showErrorMessage('Failed to fetch statistics. Is the API running?');
            }
        })
    );

    // Listen to document changes
    if (config.get<boolean>('realTimeAnalysis', true)) {
        let timeout: NodeJS.Timeout | undefined;
        const debounceDelay = config.get<number>('debounceDelay', 1000);

        vscode.workspace.onDidChangeTextDocument((event) => {
            if (timeout) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(() => {
                analyzeDocument(event.document);
            }, debounceDelay);
        });

        // Analyze active document on activation
        if (vscode.window.activeTextEditor) {
            analyzeDocument(vscode.window.activeTextEditor.document);
        }
    }

    // Listen to active editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            analyzeDocument(editor.document);
        }
    });

    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(diagnosticManager);
}

async function analyzeDocument(document: vscode.TextDocument) {
    // Skip if not a supported language
    const supportedLanguages = ['python', 'javascript', 'typescript', 'java', 'go'];
    if (!supportedLanguages.includes(document.languageId)) {
        return;
    }

    // Skip if file is too large (> 1MB)
    if (document.getText().length > 1000000) {
        return;
    }

    try {
        statusBarItem.text = "$(loading~spin) Analyzing...";
        
        const code = document.getText();
        const result = await analyzerClient.analyzeCode(
            code,
            document.fileName,
            document.languageId
        );

        // Update diagnostics
        diagnosticManager.updateDiagnostics(document.uri, result.vulnerabilities);

        // Update status bar
        const criticalCount = result.vulnerabilities.filter((v: any) => v.severity === 'CRITICAL').length;
        const highCount = result.vulnerabilities.filter((v: any) => v.severity === 'HIGH').length;
        
        if (criticalCount > 0) {
            statusBarItem.text = `$(error) ${criticalCount} Critical`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (highCount > 0) {
            statusBarItem.text = `$(warning) ${highCount} High`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else if (result.vulnerabilities.length > 0) {
            statusBarItem.text = `$(info) ${result.vulnerabilities.length} Issues`;
            statusBarItem.backgroundColor = undefined;
        } else {
            statusBarItem.text = "$(shield-check) Secure";
            statusBarItem.backgroundColor = undefined;
        }

    } catch (error) {
        console.error('Analysis error:', error);
        statusBarItem.text = "$(shield) SecureCode";
        statusBarItem.backgroundColor = undefined;
    }
}

async function scanCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No file is currently open');
        return;
    }

    await analyzeDocument(editor.document);
    vscode.window.showInformationMessage('File scan complete!');
}

async function scanProject() {
    vscode.window.showInformationMessage('Project scanning coming soon!');
}

export function deactivate() {
    if (analyzerClient) {
        analyzerClient.dispose();
    }
}