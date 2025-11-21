# Changelog

All notable changes to the "Markdown to XWiki Converter" extension will be documented in this file.

## [1.4.0] - 2025-11-21

### Added
- **Configurable Output Folders**: Added settings to specify custom output folders for converted files
  - `markdownToXwiki.xwikiOutputFolder`: Set where .xwiki files are saved
  - `markdownToXwiki.markdownOutputFolder`: Set where .md files are saved
  - If not configured, files save in the same folder as the source (default behavior)

### Fixed
- **Horizontal Rules**: Fixed conversion of `----` to `---` instead of `~~~~` by requiring at least one character in strikethrough regex

## [1.3.3] - 2025-11-21

### Fixed
- **Horizontal Rules**: Confirmed horizontal rule conversion from `----` to `---` (not `~~~~`)

## [1.3.2] - 2025-11-21

### Fixed
- **XWiki to Markdown Conversion**: Fixed conversion of enhanced XWiki features to proper Markdown
- **Table Headers**: Added proper Markdown table header separators
- **Macros**: Convert info/warning/error boxes to blockquotes, monospace to inline code
- **Text Formatting**: Fixed strikethrough (`--text--` → `~~text~~`), underline, superscript, subscript
- **Definition Lists**: Convert to bold terms with descriptions
- **Horizontal Rules**: Convert `----` to `---`
- **Line Breaks**: Convert `\\` to double spaces
- **Colored Text**: Preserve as HTML spans

## [1.3.1] - 2025-11-21

### Added
- **Scroll Synchronization**: Preview automatically scrolls to match editor position
- **Smooth Navigation**: Preview follows your cursor position in the editor
- **Percentage-based Sync**: Accurate scroll positioning based on document progress

## [1.3.0] - 2025-11-21

### Added
- **Live Preview**: Real-time preview updates as you type in XWiki files
- **Auto-refresh**: Preview automatically updates on document changes
- **Editor Sync**: Preview stays in sync when switching between XWiki files
- **Resource Management**: Proper cleanup of event listeners when preview is closed

## [1.2.5] - 2025-11-21

### Fixed
- **Horizontal Rules**: ACTUALLY fixed horizontal rules (`----`) by processing them first before any other transformations
- **Processing Order**: Moved HR processing to the very beginning to prevent conflicts with paragraph processing

## [1.2.4] - 2025-11-21

### Fixed
- **Horizontal Rules**: Fixed horizontal rules (`----`) not rendering by improving paragraph processing and marker replacement
- **HR Paragraph Wrapping**: Prevented horizontal rules from being wrapped in paragraph tags

## [1.2.3] - 2025-11-21

### Fixed
- **Blockquote Line Breaks**: Multi-line blockquotes now preserve line breaks with proper `<br>` tags
- **List Spacing**: Fixed spacing between different list types (bullet and numbered lists)
- **Horizontal Rules**: Fixed horizontal rules (`----`) not rendering, now properly displays as `<hr>` elements
- **List Type Switching**: Improved handling when switching between bullet and numbered lists

## [1.2.2] - 2025-11-21

### Fixed
- **Nested Lists**: Fixed bullet point and numbered list nesting with proper indentation
- **Sequential Numbering**: Ordered lists now display proper sequential numbers (1, 2, 3...)
- **Blockquote Styling**: Fixed dark background issue, now shows light gray background with proper contrast
- **Table of Contents**: TOC now generates actual content based on document headers
- **Code Highlighting**: Added basic JavaScript syntax highlighting for keywords, functions, strings, and comments
- **List Structure**: Proper `<ul>` and `<ol>` wrapping for nested list items

## [1.2.1] - 2025-11-21

### Fixed
- **Preview Line Spacing**: Reduced excessive line spacing in preview for better readability
- **Paragraph Formatting**: Improved paragraph spacing and removed automatic line breaks
- **Content Flow**: Better handling of block elements to prevent unwanted spacing

## [1.2.0] - 2025-11-21

### Added
- **Enhanced XWiki Syntax Highlighting**: Complete language definition for `.xwiki` files with syntax highlighting for all XWiki elements
- **Advanced Text Formatting**: Strikethrough (`--text--`), underline (`__text__`), superscript (`^^text^^`), subscript (`,,text,,`)
- **XWiki Macros**: Info boxes (`{{info}}`), warning boxes (`{{warning}}`), error boxes (`{{error}}`), TOC (`{{toc/}}`)
- **Monospace Text**: `{{monospace}}text{{/monospace}}` support
- **Colored Text**: Style attribute support `(% style="color:red" %)text(%%)`
- **Blockquotes**: `> text` with proper styling
- **Definition Lists**: `;term:definition` syntax support
- **Horizontal Rules**: `----` converted to styled separators
- **Manual Line Breaks**: `\\` support for explicit line breaks
- **Auto-closing Pairs**: Smart bracket matching for XWiki syntax (`**`, `//`, `##`, etc.)

### Enhanced
- **Preview Styling**: Added beautiful styling for info/warning/error boxes with icons and colors
- **Language Configuration**: Complete XWiki language support with word patterns and bracket matching
- **Comprehensive Test File**: Added `test-enhanced.xwiki` showcasing all features

## [1.1.0] - 2025-11-21

### Added
- **XWiki Live Preview**: Real-time preview of XWiki files with clean, light theme styling
- Preview panel opens in side-by-side view for better editing experience
- Support for XWiki syntax highlighting in preview (headers, formatting, code blocks, links, images, tables)

### Fixed
- **Image Conversion Bug**: Fixed incorrect conversion of images from `![alt](url)` to proper XWiki `[[image:url]]` format
- Conversion order issue where images were processed after links, causing malformed output
- Preview now properly handles XWiki image syntax

### Changed
- Improved preview styling with GitHub-inspired light theme
- Better typography and spacing in preview panel
- Enhanced code block styling with syntax highlighting

## [1.0.0] - 2025-11-21

### Added
- Initial release with bidirectional Markdown ↔ XWiki conversion
- Context menu integration for `.md` and `.xwiki` files
- Support for headers, bold/italic text, code blocks, links, images, lists, and tables
- Automatic file generation with appropriate extensions

### Features
- Convert Markdown files to XWiki format
- Convert XWiki files back to Markdown format
- Right-click context menu in file explorer
- Editor context menu support
- Comprehensive syntax conversion support