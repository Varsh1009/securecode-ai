import * as vscode from 'vscode';

export class QuickFixProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== 'SecureCode AI') {
                continue;
            }

            // SQL Injection fixes
            if (diagnostic.code === 'SQL Injection') {
                actions.push(this.createFixForSQLInjection(document, diagnostic));
            }

            // Hardcoded Secrets fixes
            if (diagnostic.code === 'Hardcoded Secrets') {
                actions.push(this.createFixForHardcodedSecrets(document, diagnostic));
            }

            // XSS fixes
            if (diagnostic.code === 'Cross-Site Scripting (XSS)') {
                actions.push(this.createFixForXSS(document, diagnostic));
            }

            // Always add ignore option
            actions.push(this.createIgnoreAction(diagnostic));
        }

        return actions;
    }

    private createFixForSQLInjection(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {
        const fix = new vscode.CodeAction(
            '🔧 Fix: Use parameterized query',
            vscode.CodeActionKind.QuickFix
        );
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;

        const line = document.lineAt(diagnostic.range.start.line);
        const lineText = line.text;

        // Generate fix based on language
        let fixedCode = '';
        if (lineText.includes('execute')) {
            // Python example
            fixedCode = lineText.replace(
                /execute\((.*?)\+.*?\)/,
                'execute($1, (user_input,))'
            );
        }

        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(
            document.uri,
            line.range,
            fixedCode || '# TODO: Use parameterized queries instead of string concatenation'
        );

        return fix;
    }

    private createFixForHardcodedSecrets(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {
        const fix = new vscode.CodeAction(
            '🔧 Fix: Move to environment variable',
            vscode.CodeActionKind.QuickFix
        );
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;

        const line = document.lineAt(diagnostic.range.start.line);
        const lineText = line.text;

        // Extract variable name
        const match = lineText.match(/(\w+)\s*=\s*['"](.+?)['"]/);
        if (match) {
            const varName = match[1];
            const envVarName = varName.toUpperCase();
            
            const fixedCode = lineText.replace(
                /=\s*['"].*?['"]/,
                `= os.getenv('${envVarName}')  # Store in .env file`
            );

            fix.edit = new vscode.WorkspaceEdit();
            fix.edit.replace(document.uri, line.range, fixedCode);

            // Add import if needed
            const firstLine = document.lineAt(0);
            if (!document.getText().includes('import os')) {
                fix.edit.insert(document.uri, firstLine.range.start, 'import os\n');
            }
        }

        return fix;
    }

    private createFixForXSS(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {
        const fix = new vscode.CodeAction(
            '🔧 Fix: Use safe DOM method',
            vscode.CodeActionKind.QuickFix
        );
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;

        const line = document.lineAt(diagnostic.range.start.line);
        const lineText = line.text;

        const fixedCode = lineText.replace(
            'innerHTML',
            'textContent'
        );

        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(document.uri, line.range, fixedCode);

        return fix;
    }

    private createIgnoreAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const action = new vscode.CodeAction(
            '🚫 Ignore this warning',
            vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];
        action.command = {
            command: 'securecode.ignoreWarning',
            title: 'Ignore Warning',
            arguments: [diagnostic]
        };
        return action;
    }
}