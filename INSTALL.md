# Installation Guide

## Install the Extension

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Extensions: Install from VSIX..."
4. Select the file: `markdown-to-xwiki-1.0.0.vsix`

## Usage

1. Open any `.md` file in VS Code
2. Right-click in the editor or on the file in Explorer
3. Select "Convert to XWiki"
4. The converted `.xwiki` file will be created and opened

## Test the Extension

Use the included `test.md` file to verify the conversion works correctly.

## Conversion Examples

### Markdown Input:
```markdown
# Title
**bold** and *italic*
`inline code`
```

### XWiki Output:
```
= Title =
**bold** and //italic//
##inline code##
```