import * as vscode from 'vscode';

export class XWikiPreviewProvider {
    private static readonly viewType = 'xwiki.preview';
    private panel: vscode.WebviewPanel | undefined;

    constructor(private readonly extensionUri: vscode.Uri) {}

    public showPreview(document: vscode.TextDocument) {
        if (this.panel) {
            this.panel.reveal();
        } else {
            this.panel = vscode.window.createWebviewPanel(
                XWikiPreviewProvider.viewType,
                `XWiki Preview: ${document.fileName}`,
                vscode.ViewColumn.Beside,
                { 
                    enableScripts: true,
                    localResourceRoots: [
                        this.extensionUri,
                        ...(vscode.workspace.workspaceFolders?.map(folder => folder.uri) || [])
                    ]
                }
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.disposeLivePreview();
            });

            this.setupLivePreview(document);
        }

        this.updatePreview(document);
    }

    private disposables: vscode.Disposable[] = [];

    private setupLivePreview(document: vscode.TextDocument) {
        const changeDisposable = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === document && this.panel) {
                this.updatePreview(document);
            }
        });

        const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document === document && this.panel) {
                this.updatePreview(document);
            }
        });

        const scrollDisposable = vscode.window.onDidChangeTextEditorVisibleRanges(e => {
            if (e.textEditor.document === document && this.panel) {
                const lineNumber = e.visibleRanges[0]?.start.line || 0;
                const totalLines = document.lineCount;
                const scrollPercentage = lineNumber / totalLines;
                this.panel.webview.postMessage({ 
                    command: 'scroll', 
                    percentage: scrollPercentage 
                });
            }
        });

        this.disposables.push(changeDisposable, activeEditorDisposable, scrollDisposable);
    }

    private disposeLivePreview() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

    private updatePreview(document: vscode.TextDocument) {
        if (!this.panel) return;

        const html = this.convertXWikiToHtml(document.getText(), document.uri);
        this.panel.webview.html = this.getWebviewContent(html);
    }

    private convertXWikiToHtml(xwiki: string, documentUri?: vscode.Uri): string {
        let html = xwiki;

        // Horizontal rules (process first to avoid conflicts)
        html = html.replace(/^----+$/gm, '<hr>');

        // Headers
        html = html.replace(/^====== (.*?) ======$/gm, '<h6>$1</h6>');
        html = html.replace(/^===== (.*?) =====$/gm, '<h5>$1</h5>');
        html = html.replace(/^==== (.*?) ====$/gm, '<h4>$1</h4>');
        html = html.replace(/^=== (.*?) ===$/gm, '<h3>$1</h3>');
        html = html.replace(/^== (.*?) ==$/gm, '<h2>$1</h2>');
        html = html.replace(/^= (.*?) =$/gm, '<h1>$1</h1>');

        // Code blocks (do early to avoid conflicts)
        html = html.replace(/\{\{code language="([^"]*)"\}\}([\s\S]*?)\{\{\/code\}\}/g, (match, lang, code) => {
            if (lang === 'javascript') {
                code = code.replace(/\b(function|return|const|let|var|if|else|for|while)\b/g, '<span class="token keyword">$1</span>');
                code = code.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, '<span class="token function">$1</span>(');
                code = code.replace(/(['"`])([^'"\`]*?)\1/g, '<span class="token string">$1$2$1</span>');
                code = code.replace(/\/\/.*$/gm, '<span class="token comment">$&</span>');
                code = code.replace(/\b\d+\b/g, '<span class="token number">$&</span>');
            }
            return `<pre><code class="language-${lang}">${code}</code></pre>`;
        });
        html = html.replace(/\{\{monospace\}\}(.*?)\{\{\/monospace\}\}/g, '<code class="monospace">$1</code>');

        // Macros
        html = html.replace(/\{\{info\}\}([\s\S]*?)\{\{\/info\}\}/g, '<div class="info-box">ℹ️ $1</div>');
        html = html.replace(/\{\{warning\}\}([\s\S]*?)\{\{\/warning\}\}/g, '<div class="warning-box">⚠️ $1</div>');
        html = html.replace(/\{\{error\}\}([\s\S]*?)\{\{\/error\}\}/g, '<div class="error-box">❌ $1</div>');
        html = html.replace(/\{\{toc\/\}\}/g, '<div class="toc">📋 Table of Contents</div>');

        // Text formatting (order matters)
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\/\/(.*?)\/\//g, '<em>$1</em>');
        html = html.replace(/--(.*?)--/g, '<del>$1</del>');
        html = html.replace(/__(.*?)__/g, '<u>$1</u>');
        html = html.replace(/\^\^(.*?)\^\^/g, '<sup>$1</sup>');
        html = html.replace(/,,(.*?),,/g, '<sub>$1</sub>');

        // Inline code
        html = html.replace(/##(.*?)##/g, '<code>$1</code>');

        // Colored text
        html = html.replace(/\(% style="([^"]+)" %\)(.*?)\(%%\)/g, '<span style="$1">$2</span>');

        // Images - handle local paths
        html = html.replace(/\[\[image:([^|\]]+)\|\|alt="([^"]*?)"\]\]/g, (match, src, alt) => {
            const resolvedSrc = this.resolveImagePath(src, documentUri);
            return `<img src="${resolvedSrc}" alt="${alt}" />`;
        });
        html = html.replace(/\[\[image:([^\]]+)\]\]/g, (match, src) => {
            const resolvedSrc = this.resolveImagePath(src, documentUri);
            return `<img src="${resolvedSrc}" alt="Image" />`;
        });

        // Links
        html = html.replace(/\[\[([^>]+)>>([^\]]+)\]\]/g, '<a href="$2">$1</a>');

        // Blockquotes - preserve line breaks
        html = html.replace(/^> (.*)$/gm, 'BLOCKQUOTE_LINE:$1');
        html = html.replace(/(BLOCKQUOTE_LINE:[^\n]*\n?)+/g, (match) => {
            const lines = match.split('\n').filter(line => line.startsWith('BLOCKQUOTE_LINE:'));
            const content = lines.map(line => line.replace('BLOCKQUOTE_LINE:', '')).join('<br>');
            return `<blockquote>${content}</blockquote>`;
        });

        // TOC - generate actual table of contents
        if (html.includes('{{toc/}}')) {
            const headers = html.match(/<h[1-6]>([^<]+)<\/h[1-6]>/g) || [];
            const tocItems = headers.map(h => {
                const levelMatch = h.match(/<h([1-6])>/);
                if (levelMatch) {
                    const level = levelMatch[1];
                    const text = h.replace(/<\/?h[1-6]>/g, '');
                    const indent = '  '.repeat(parseInt(level) - 1);
                    return `${indent}• ${text}`;
                }
                return '';
            }).filter(item => item).join('\n');
            html = html.replace(/\{\{toc\/\}\}/, `<div class="toc">📋 Table of Contents\n${tocItems}</div>`);
        }

        // Definition lists
        html = html.replace(/^;([^:]+):(.*)$/gm, '<dt>$1</dt><dd>$2</dd>');



        // Line breaks
        html = html.replace(/\\\\$/gm, '<br>');

        // Lists - process nested structure
        const lines = html.split('\n');
        let processedLines = [];
        let inUL = false, inOL = false;
        let lastIndent = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const ulMatch = line.match(/^(\s*)\* (.*)$/);
            const olMatch = line.match(/^(\s*)1\. (.*)$/);
            
            if (ulMatch) {
                if (inOL) {
                    processedLines.push('</ol>');
                    inOL = false;
                }
                const indent = ulMatch[1].length;
                if (!inUL || indent > lastIndent) {
                    processedLines.push(ulMatch[1] + '<ul>');
                    inUL = true;
                }
                if (indent < lastIndent) {
                    processedLines.push(ulMatch[1] + '</ul>');
                }
                processedLines.push(ulMatch[1] + '<li>' + ulMatch[2] + '</li>');
                lastIndent = indent;
            } else if (olMatch) {
                if (inUL) {
                    processedLines.push('</ul>');
                    inUL = false;
                }
                const indent = olMatch[1].length;
                if (!inOL || indent > lastIndent) {
                    processedLines.push(olMatch[1] + '<ol>');
                    inOL = true;
                }
                if (indent < lastIndent) {
                    processedLines.push(olMatch[1] + '</ol>');
                }
                processedLines.push(olMatch[1] + '<li>' + olMatch[2] + '</li>');
                lastIndent = indent;
            } else {
                if (inUL) {
                    processedLines.push('</ul>');
                    inUL = false;
                }
                if (inOL) {
                    processedLines.push('</ol>');
                    inOL = false;
                }
                processedLines.push(line);
                lastIndent = 0;
            }
        }
        
        if (inUL) processedLines.push('</ul>');
        if (inOL) processedLines.push('</ol>');
        
        html = processedLines.join('\n');

        // Tables
        html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
            const cells = content.split('|').map((cell: string) => `<td>${cell.trim()}</td>`).join('');
            return `<tr>${cells}</tr>`;
        });

        // Wrap tables and definition lists
        html = html.replace(/(<tr>.*<\/tr>)/gs, '<table>$1</table>');
        html = html.replace(/(<dt>.*<\/dd>)/gs, '<dl>$1</dl>');

        // Convert paragraphs (double line breaks)
        html = html.replace(/\n\n+/g, '</p><p>');
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[1-6]>)/g, '$1');
        html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<table>)/g, '$1');
        html = html.replace(/(<\/table>)<\/p>/g, '$1');
        html = html.replace(/<p>(<div)/g, '$1');
        html = html.replace(/(<\/div>)<\/p>/g, '$1');
        html = html.replace(/<p>(<blockquote>)/g, '$1');
        html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
        html = html.replace(/<p>(<dl>)/g, '$1');
        html = html.replace(/(<\/dl>)<\/p>/g, '$1');
        html = html.replace(/<p>(<pre>)/g, '$1');
        html = html.replace(/(<\/pre>)<\/p>/g, '$1');
        html = html.replace(/<p>(<hr>)/g, '$1');
        html = html.replace(/(<hr>)<\/p>/g, '$1');

        return html;
    }

    private resolveImagePath(src: string, documentUri?: vscode.Uri): string {
        // If it's already a web URL, return as-is
        if (src.startsWith('http://') || src.startsWith('https://')) {
            return src;
        }

        // Handle local paths
        if (documentUri && this.panel) {
            try {
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
                let imagePath: vscode.Uri;

                if (src.startsWith('./')) {
                    // Relative to document directory
                    const documentDir = vscode.Uri.joinPath(documentUri, '..');
                    imagePath = vscode.Uri.joinPath(documentDir, src.substring(2));
                } else if (src.startsWith('../')) {
                    // Relative to document directory
                    const documentDir = vscode.Uri.joinPath(documentUri, '..');
                    imagePath = vscode.Uri.joinPath(documentDir, src);
                } else if (src.startsWith('/')) {
                    // Absolute path from workspace root
                    if (workspaceFolder) {
                        imagePath = vscode.Uri.joinPath(workspaceFolder.uri, src.substring(1));
                    } else {
                        imagePath = vscode.Uri.file(src);
                    }
                } else {
                    // Relative to document directory (no prefix)
                    const documentDir = vscode.Uri.joinPath(documentUri, '..');
                    imagePath = vscode.Uri.joinPath(documentDir, src);
                }

                const webviewUri = this.panel.webview.asWebviewUri(imagePath);
                return webviewUri.toString();
            } catch (error) {
                return src;
            }
        }

        return src;
    }

    private getWebviewContent(html: string): string {
        const cspSource = this.panel?.webview.cspSource || "'self'";
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; script-src ${cspSource} 'unsafe-inline'; style-src ${cspSource} 'unsafe-inline';">
    <title>XWiki Preview</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px; 
            line-height: 1.4; 
            background: #ffffff;
            color: #333333;
            max-width: 900px;
            margin: 0 auto;
        }
        h1, h2, h3, h4, h5, h6 { 
            color: #2c3e50; 
            margin-top: 24px; 
            margin-bottom: 12px;
            font-weight: 600;
        }
        h1 { font-size: 2em; border-bottom: 2px solid #e1e4e8; padding-bottom: 8px; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #e1e4e8; padding-bottom: 6px; }
        h3 { font-size: 1.25em; }
        code { 
            background: #f6f8fa; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.9em;
            color: #d73a49;
        }
        pre { 
            background: #f6f8fa; 
            padding: 16px; 
            border-radius: 6px; 
            overflow-x: auto;
            border: 1px solid #e1e4e8;
        }
        pre code {
            background: none;
            padding: 0;
            color: #24292e;
        }
        .language-javascript .token.keyword { color: #d73a49; }
        .language-javascript .token.function { color: #6f42c1; }
        .language-javascript .token.string { color: #032f62; }
        .language-javascript .token.comment { color: #6a737d; font-style: italic; }
        .language-javascript .token.number { color: #005cc5; }
        .language-javascript .token.operator { color: #d73a49; }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 16px 0;
            border: 1px solid #e1e4e8;
        }
        td, th { 
            border: 1px solid #e1e4e8; 
            padding: 12px; 
            text-align: left;
        }
        th {
            background: #f6f8fa;
            font-weight: 600;
        }
        a { 
            color: #0366d6; 
            text-decoration: none; 
        }
        a:hover { 
            text-decoration: underline; 
        }
        .toc {
            background: #f8f9fa;
            padding: 16px;
            border-radius: 6px;
            border: 1px solid #e1e4e8;
            margin: 16px 0;
            white-space: pre-line;
            font-family: monospace;
            font-size: 0.9em;
        }
        blockquote {
            margin: 16px 0;
            padding: 12px 16px;
            border-left: 4px solid #dfe2e5;
            background: #f8f9fa;
            color: #586069;
            font-style: italic;
        }
        ul, ol {
            margin: 8px 0;
            padding-left: 24px;
        }
        ul ul, ol ol, ul ol, ol ul {
            margin: 4px 0;
        }
        li {
            margin: 2px 0;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
        }
        .info-box, .warning-box, .error-box {
            padding: 12px 16px;
            margin: 16px 0;
            border-radius: 6px;
            border-left: 4px solid;
        }
        .info-box {
            background: #e3f2fd;
            border-left-color: #2196f3;
            color: #0d47a1;
        }
        .warning-box {
            background: #fff3e0;
            border-left-color: #ff9800;
            color: #e65100;
        }
        .error-box {
            background: #ffebee;
            border-left-color: #f44336;
            color: #c62828;
        }

        .monospace {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        }
        del {
            color: #6a737d;
        }
        u {
            text-decoration: underline;
        }
        sup, sub {
            font-size: 0.8em;
        }
        dl {
            margin: 16px 0;
        }
        dt {
            font-weight: 600;
            margin-top: 8px;
        }
        dd {
            margin-left: 20px;
            margin-bottom: 8px;
        }
        hr {
            border: none;
            border-top: 2px solid #e1e4e8;
            margin: 24px 0;
        }
        p {
            margin: 8px 0;
        }
        p:first-child {
            margin-top: 0;
        }
        p:last-child {
            margin-bottom: 0;
        }
    </style>
    <script>
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'scroll') {
                const scrollHeight = document.body.scrollHeight - window.innerHeight;
                const targetScroll = scrollHeight * message.percentage;
                window.scrollTo(0, targetScroll);
            }
        });
    </script>
</head>
<body>
    ${html}
</body>
</html>`;
    }
}