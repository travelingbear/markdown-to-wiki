import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { XWikiPreviewProvider } from './xwikiPreview';

export function activate(context: vscode.ExtensionContext) {
    const previewProvider = new XWikiPreviewProvider(context.extensionUri);

    const showPreview = vscode.commands.registerCommand('xwiki.showPreview', () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.endsWith('.xwiki')) {
            previewProvider.showPreview(activeEditor.document);
        } else {
            vscode.window.showErrorMessage('Please open an XWiki file to preview');
        }
    });

    const mdToXwiki = vscode.commands.registerCommand('markdown-to-xwiki.convert', async (uri: vscode.Uri) => {
        try {
            const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
            if (!filePath || !filePath.endsWith('.md')) {
                vscode.window.showErrorMessage('Please select a Markdown file');
                return;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const xwikiContent = convertMarkdownToXWiki(content);
            
            const config = vscode.workspace.getConfiguration('markdownToXwiki');
            const outputFolder = config.get<string>('xwikiOutputFolder', '');
            
            let outputPath: string;
            if (outputFolder && outputFolder.trim() !== '') {
                const fileName = path.basename(filePath, '.md') + '.xwiki';
                outputPath = path.join(outputFolder, fileName);
            } else {
                outputPath = filePath.replace('.md', '.xwiki');
            }
            
            fs.writeFileSync(outputPath, xwikiContent);
            
            vscode.window.showInformationMessage(`Converted to XWiki: ${path.basename(outputPath)}`);
            
            const doc = await vscode.workspace.openTextDocument(outputPath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });

    const xwikiToMd = vscode.commands.registerCommand('xwiki-to-markdown.convert', async (uri: vscode.Uri) => {
        try {
            const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
            if (!filePath || !filePath.endsWith('.xwiki')) {
                vscode.window.showErrorMessage('Please select an XWiki file');
                return;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const markdownContent = convertXWikiToMarkdown(content);
            
            const config = vscode.workspace.getConfiguration('markdownToXwiki');
            const outputFolder = config.get<string>('markdownOutputFolder', '');
            
            let outputPath: string;
            if (outputFolder && outputFolder.trim() !== '') {
                const fileName = path.basename(filePath, '.xwiki') + '.md';
                outputPath = path.join(outputFolder, fileName);
            } else {
                outputPath = filePath.replace('.xwiki', '.md');
            }
            
            fs.writeFileSync(outputPath, markdownContent);
            
            vscode.window.showInformationMessage(`Converted to Markdown: ${path.basename(outputPath)}`);
            
            const doc = await vscode.workspace.openTextDocument(outputPath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });

    context.subscriptions.push(mdToXwiki, xwikiToMd, showPreview);
}

function convertMarkdownToXWiki(markdown: string): string {
    let xwiki = markdown;

    // Code blocks (do first to avoid conflicts)
    xwiki = xwiki.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `{{code language="${lang || 'none'}"}}${code.trim()}{{/code}}`;
    });

    // Headers
    xwiki = xwiki.replace(/^# (.*$)/gm, '= $1 =');
    xwiki = xwiki.replace(/^## (.*$)/gm, '== $1 ==');
    xwiki = xwiki.replace(/^### (.*$)/gm, '=== $1 ===');
    xwiki = xwiki.replace(/^#### (.*$)/gm, '==== $1 ====');
    xwiki = xwiki.replace(/^##### (.*$)/gm, '===== $1 =====');
    xwiki = xwiki.replace(/^###### (.*$)/gm, '====== $1 ======');

    // Bold and Italic (order matters)
    xwiki = xwiki.replace(/\*\*\*(.*?)\*\*\*/g, '***//$1//***');
    xwiki = xwiki.replace(/\*\*(.*?)\*\*/g, '**$1**');
    xwiki = xwiki.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '//$1//');

    // Inline code
    xwiki = xwiki.replace(/`([^`]+)`/g, '##$1##');

    // Images (do before links to avoid conflicts)
    xwiki = xwiki.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[[image:$2]]');

    // Links
    xwiki = xwiki.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[[$1>>$2]]');

    // Lists
    xwiki = xwiki.replace(/^(\s*)- (.*$)/gm, '$1* $2');
    xwiki = xwiki.replace(/^(\s*)\d+\. (.*$)/gm, '$11. $2');

    // Tables (remove header separator)
    xwiki = xwiki.replace(/^\|[-\s|]+\|$/gm, '');
    xwiki = xwiki.replace(/\|(.+)\|/g, (match, content) => {
        const cells = content.split('|').map((cell: string) => cell.trim());
        return '|' + cells.join('|') + '|';
    });

    return xwiki;
}

function convertXWikiToMarkdown(xwiki: string): string {
    let markdown = xwiki;

    // Code blocks
    markdown = markdown.replace(/\{\{code language="([^"]*)"\}\}([\s\S]*?)\{\{\/code\}\}/g, '```$1\n$2\n```');

    // Macros (convert to blockquotes or remove)
    markdown = markdown.replace(/\{\{info\}\}([\s\S]*?)\{\{\/info\}\}/g, '> **Info:** $1');
    markdown = markdown.replace(/\{\{warning\}\}([\s\S]*?)\{\{\/warning\}\}/g, '> **Warning:** $1');
    markdown = markdown.replace(/\{\{error\}\}([\s\S]*?)\{\{\/error\}\}/g, '> **Error:** $1');
    markdown = markdown.replace(/\{\{toc\/\}\}/g, '<!-- Table of Contents -->');
    markdown = markdown.replace(/\{\{monospace\}\}(.*?)\{\{\/monospace\}\}/g, '`$1`');

    // Headers
    markdown = markdown.replace(/^====== (.*?) ======$/gm, '###### $1');
    markdown = markdown.replace(/^===== (.*?) =====$/gm, '##### $1');
    markdown = markdown.replace(/^==== (.*?) ====$/gm, '#### $1');
    markdown = markdown.replace(/^=== (.*?) ===$/gm, '### $1');
    markdown = markdown.replace(/^== (.*?) ==$/gm, '## $1');
    markdown = markdown.replace(/^= (.*?) =$/gm, '# $1');

    // Text formatting
    markdown = markdown.replace(/\*\*\*\/\/(.*?)\/\/\*\*\*/g, '***$1***');
    markdown = markdown.replace(/\*\*(.*?)\*\*/g, '**$1**');
    markdown = markdown.replace(/\/\/(.*?)\/\//g, '*$1*');
    markdown = markdown.replace(/--(.+?)--/g, '~~$1~~');
    markdown = markdown.replace(/__(.*?)__/g, '<u>$1</u>');
    markdown = markdown.replace(/\^\^(.*?)\^\^/g, '<sup>$1</sup>');
    markdown = markdown.replace(/,,(.*?),,/g, '<sub>$1</sub>');

    // Colored text (convert to HTML)
    markdown = markdown.replace(/\(% style="([^"]+)" %\)(.*?)\(%%\)/g, '<span style="$1">$2</span>');

    // Inline code
    markdown = markdown.replace(/##(.*?)##/g, '`$1`');

    // Links
    markdown = markdown.replace(/\[\[([^>]+)>>([^\]]+)\]\]/g, '[$1]($2)');

    // Images
    markdown = markdown.replace(/\[\[image:([^\]]+)\]\]/g, '![Image]($1)');

    // Definition lists (convert to bold terms)
    markdown = markdown.replace(/^;([^:]+):(.*)$/gm, '**$1**: $2');

    // Line breaks
    markdown = markdown.replace(/\\\\$/gm, '  ');

    // Tables (add header separator)
    const lines = markdown.split('\n');
    let inTable = false;
    let tableHeaderAdded = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^\|.*\|$/)) {
            if (!inTable) {
                inTable = true;
                tableHeaderAdded = false;
            }
            if (!tableHeaderAdded) {
                const cells = line.split('|').slice(1, -1);
                const headerSeparator = '|' + cells.map(() => '----').join('|') + '|';
                lines.splice(i + 1, 0, headerSeparator);
                tableHeaderAdded = true;
                i++;
            }
        } else if (inTable && line.trim() === '') {
            inTable = false;
        }
    }
    markdown = lines.join('\n');

    // Horizontal rules (do AFTER table processing)
    markdown = markdown.replace(/^----+$/gm, '---');

    // Lists
    markdown = markdown.replace(/^(\s*)\* (.*$)/gm, '$1- $2');
    markdown = markdown.replace(/^(\s*)1\. (.*$)/gm, '$11. $2');

    return markdown;
}

export function deactivate() {}