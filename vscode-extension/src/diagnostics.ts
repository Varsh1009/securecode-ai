import * as vscode from 'vscode';
import { Vulnerability } from './analyzer';

export class DiagnosticManager {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private decorationTypes: Map<string, vscode.TextEditorDecorationType>;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('securecode');
        this.decorationTypes = new Map();

        // Create decoration types for different severities
        this.decorationTypes.set('CRITICAL', vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.5)',
            borderRadius: '3px',
            overviewRulerColor: 'red',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
        }));

        this.decorationTypes.set('HIGH', vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 136, 0, 0.1)',
            border: '1px solid rgba(255, 136, 0, 0.5)',
            borderRadius: '3px',
            overviewRulerColor: 'orange',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
        }));

        this.decorationTypes.set('MEDIUM', vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 255, 0, 0.05)',
            border: '1px solid rgba(255, 255, 0, 0.3)',
            borderRadius: '3px',
            overviewRulerColor: 'yellow',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
        }));
    }

    updateDiagnostics(uri: vscode.Uri, vulnerabilities: Vulnerability[]) {
        const diagnostics: vscode.Diagnostic[] = [];

        for (const vuln of vulnerabilities) {
            const line = Math.max(0, vuln.line_number - 1);
            const startChar = Math.max(0, vuln.column_number);
            
            // Get the line text to determine length
            const editor = vscode.window.activeTextEditor;
            let endChar = startChar + 20; // Default length
            
            if (editor && editor.document.uri.toString() === uri.toString()) {
                const lineText = editor.document.lineAt(line).text;
                endChar = Math.min(lineText.length, startChar + lineText.trim().length);
            }

            const range = new vscode.Range(
                new vscode.Position(line, startChar),
                new vscode.Position(line, endChar)
            );

            const diagnostic = new vscode.Diagnostic(
                range,
                this.formatMessage(vuln),
                this.getSeverity(vuln.severity)
            );

            diagnostic.code = vuln.category;
            diagnostic.source = 'SecureCode AI';
            
            // Add related information
            diagnostic.relatedInformation = [
                new vscode.DiagnosticRelatedInformation(
                    new vscode.Location(uri, range),
                    `Confidence: ${(vuln.confidence_score * 100).toFixed(0)}% | ${vuln.code_snippet}`
                )
            ];

            diagnostics.push(diagnostic);
        }

        this.diagnosticCollection.set(uri, diagnostics);
        this.applyDecorations(uri, vulnerabilities);
    }

    private applyDecorations(uri: vscode.Uri, vulnerabilities: Vulnerability[]) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.uri.toString() !== uri.toString()) {
            return;
        }

        // Group vulnerabilities by severity
        const decorationsByType = new Map<string, vscode.DecorationOptions[]>();

        for (const vuln of vulnerabilities) {
            const line = Math.max(0, vuln.line_number - 1);
            const startChar = Math.max(0, vuln.column_number);
            const lineText = editor.document.lineAt(line).text;
            const endChar = Math.min(lineText.length, startChar + lineText.trim().length);

            const range = new vscode.Range(
                new vscode.Position(line, startChar),
                new vscode.Position(line, endChar)
            );

            const decoration: vscode.DecorationOptions = {
                range,
                hoverMessage: this.createHoverMessage(vuln),
            };

            if (!decorationsByType.has(vuln.severity)) {
                decorationsByType.set(vuln.severity, []);
            }
            decorationsByType.get(vuln.severity)!.push(decoration);
        }

        // Apply decorations
        for (const [severity, decorations] of decorationsByType) {
            const decorationType = this.decorationTypes.get(severity);
            if (decorationType) {
                editor.setDecorations(decorationType, decorations);
            }
        }
    }

    private createHoverMessage(vuln: Vulnerability): vscode.MarkdownString {
        const severityEmoji = {
            'CRITICAL': '🔴',
            'HIGH': '🟠',
            'MEDIUM': '🟡',
            'LOW': '🟢'
        }[vuln.severity] || '⚪';

        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;

        md.appendMarkdown(`### ${severityEmoji} ${vuln.category}\n\n`);
        md.appendMarkdown(`**Severity:** ${vuln.severity}\n\n`);
        md.appendMarkdown(`**Message:** ${vuln.message}\n\n`);
        md.appendMarkdown(`**Confidence:** ${(vuln.confidence_score * 100).toFixed(0)}%\n\n`);
        md.appendMarkdown(`---\n\n`);
        md.appendMarkdown(`**Code:**\n\`\`\`\n${vuln.code_snippet}\n\`\`\`\n\n`);
        md.appendMarkdown(`*Powered by SecureCode AI*`);

        return md;
    }

    private formatMessage(vuln: Vulnerability): string {
        return `[${vuln.severity}] ${vuln.category}: ${vuln.message}`;
    }

    private getSeverity(severity: string): vscode.DiagnosticSeverity {
        switch (severity) {
            case 'CRITICAL':
                return vscode.DiagnosticSeverity.Error;
            case 'HIGH':
                return vscode.DiagnosticSeverity.Error;
            case 'MEDIUM':
                return vscode.DiagnosticSeverity.Warning;
            case 'LOW':
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Hint;
        }
    }

    clear() {
        this.diagnosticCollection.clear();
        
        // Clear decorations
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            for (const decorationType of this.decorationTypes.values()) {
                editor.setDecorations(decorationType, []);
            }
        }
    }

    dispose() {
        this.diagnosticCollection.dispose();
        for (const decorationType of this.decorationTypes.values()) {
            decorationType.dispose();
        }
    }
}