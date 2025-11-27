/**
 * Export functionality for generating self-contained HTML review documents
 */

interface CodeFile {
  content: string
  language: string
  diff?: {
    added_lines: number[]
    removed_lines: number[]
  }
}

interface ExportOptions {
  content: string
  title?: string
  diffData: Record<string, { added_lines: number[]; removed_lines: number[] }>
}

/**
 * Parse all [[file:path:line]] references from markdown content
 */
export function parseCodeReferences(content: string): Array<{
  filePath: string
  lineNumber?: number
  lineEnd?: number
}> {
  const codeRefRegex = /\[\[file:([^:\]]+)(?::(\d+)(?:-(\d+))?)?\]\]/g
  const refs: Array<{ filePath: string; lineNumber?: number; lineEnd?: number }> = []
  const seen = new Set<string>()

  let match
  while ((match = codeRefRegex.exec(content)) !== null) {
    const [, path, line, lineEnd] = match
    // Deduplicate by file path (we'll fetch each file once)
    if (!seen.has(path)) {
      seen.add(path)
      refs.push({
        filePath: path,
        lineNumber: line ? parseInt(line, 10) : undefined,
        lineEnd: lineEnd ? parseInt(lineEnd, 10) : undefined,
      })
    }
  }

  return refs
}

/**
 * Fetch a code file from the server
 */
async function fetchCodeFile(filePath: string): Promise<CodeFile | null> {
  try {
    const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
    if (!response.ok) return null
    const data = await response.json()
    return {
      content: data.content || '',
      language: data.language || 'text',
    }
  } catch {
    return null
  }
}

/**
 * Fetch all referenced code files
 */
async function fetchAllCodeFiles(
  refs: Array<{ filePath: string }>,
  diffData: Record<string, { added_lines: number[]; removed_lines: number[] }>
): Promise<Record<string, CodeFile>> {
  const files: Record<string, CodeFile> = {}

  await Promise.all(
    refs.map(async (ref) => {
      const file = await fetchCodeFile(ref.filePath)
      if (file) {
        files[ref.filePath] = {
          ...file,
          diff: diffData[ref.filePath],
        }
      }
    })
  )

  return files
}

/**
 * Convert markdown to HTML (simple conversion for export)
 */
function markdownToHtml(content: string): string {
  // Replace code references with clickable buttons
  let html = content.replace(
    /\[\[file:([^:\]]+)(?::(\d+)(?:-(\d+))?)?\]\]/g,
    (_, path, line, lineEnd) => {
      const lineDisplay = line ? (lineEnd ? `:${line}-${lineEnd}` : `:${line}`) : ''
      const dataAttrs = `data-path="${path}"${line ? ` data-line="${line}"` : ''}${lineEnd ? ` data-line-end="${lineEnd}"` : ''}`
      return `<button class="code-ref-btn" ${dataAttrs} onclick="openCodeViewer('${path}', ${line || 'null'}, ${lineEnd || 'null'})">${path}${lineDisplay}</button>`
    }
  )

  // Basic markdown conversions
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Paragraphs - wrap text blocks
  html = html.replace(/^(?!<[hupbo]|<li|<blockquote)(.+)$/gm, '<p>$1</p>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>')

  // Tables (basic support)
  html = html.replace(/^\|(.+)\|$/gm, (_match, content) => {
    const cells = content.split('|').map((cell: string) => cell.trim())
    const isHeader = cells.every((c: string) => /^-+$/.test(c))
    if (isHeader) return '' // Skip separator row
    const tag = 'td'
    return `<tr>${cells.map((c: string) => `<${tag}>${c}</${tag}>`).join('')}</tr>`
  })
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>')

  return html
}

/**
 * Generate the self-contained HTML export
 */
export async function generateExportHtml(options: ExportOptions): Promise<string> {
  const { content, title = 'Document Review Export', diffData } = options

  // Parse and fetch all code references
  const refs = parseCodeReferences(content)
  const codeFiles = await fetchAllCodeFiles(refs, diffData)

  // Convert markdown to HTML
  const htmlContent = markdownToHtml(content)

  // Generate the self-contained HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* Reset and base styles */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0f172a;
      color: #f1f5f9;
      line-height: 1.6;
      padding: 2rem;
    }

    /* Content container */
    .content {
      max-width: 900px;
      margin: 0 auto;
      background: #1e293b;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }

    /* Typography */
    h1 { font-size: 1.75rem; font-weight: bold; margin: 1.5rem 0 0.75rem; color: #f1f5f9; }
    h2 { font-size: 1.5rem; font-weight: bold; margin: 1.25rem 0 0.5rem; color: #f1f5f9; }
    h3 { font-size: 1.25rem; font-weight: bold; margin: 1rem 0 0.5rem; color: #f1f5f9; }
    p { margin-bottom: 0.75rem; }

    strong { font-weight: bold; }
    em { font-style: italic; }

    a { color: #3b82f6; text-decoration: underline; }
    a:hover { color: #60a5fa; }

    /* Lists */
    ul, ol { margin: 0.75rem 0 0.75rem 1.5rem; }
    li { margin-bottom: 0.25rem; }

    /* Code */
    code {
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      background: #0f172a;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #3b82f6;
    }

    pre {
      background: #0f172a;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 0.75rem 0;
    }

    pre code {
      background: transparent;
      padding: 0;
      color: #e2e8f0;
    }

    /* Blockquote */
    blockquote {
      border-left: 4px solid #334155;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #94a3b8;
      font-style: italic;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }

    th, td {
      padding: 0.5rem 1rem;
      border: 1px solid #334155;
      text-align: left;
    }

    th {
      background: #0f172a;
      font-weight: bold;
    }

    hr {
      border: none;
      border-top: 1px solid #334155;
      margin: 2rem 0;
    }

    /* Code reference button */
    .code-ref-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      background: #3b82f6;
      color: #0f172a;
      border: none;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.875rem;
      cursor: pointer;
      transition: transform 0.1s;
      word-break: break-all;
    }

    .code-ref-btn:hover {
      transform: scale(1.02);
      background: #60a5fa;
    }

    .code-ref-btn::before {
      content: '</>';
      font-size: 0.75rem;
    }

    /* Modal overlay */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .modal-overlay.visible {
      display: flex;
    }

    /* Modal content */
    .modal-content {
      background: #1e293b;
      border-radius: 8px;
      width: 100%;
      max-width: 1000px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #334155;
    }

    .modal-title {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .modal-close {
      background: #334155;
      border: none;
      color: #94a3b8;
      width: 2rem;
      height: 2rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-close:hover {
      background: #475569;
      color: #f1f5f9;
    }

    .modal-body {
      overflow: auto;
      flex: 1;
    }

    /* Code viewer */
    .code-container {
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
    }

    .code-line {
      display: flex;
      min-height: 1.5em;
    }

    .code-line:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .code-line.highlighted {
      background: rgba(59, 130, 246, 0.2);
    }

    .code-line.diff-added {
      background: rgba(34, 197, 94, 0.15);
    }

    .code-line.diff-removed {
      background: rgba(239, 68, 68, 0.15);
    }

    .line-number {
      width: 4rem;
      padding: 0 1rem;
      text-align: right;
      color: #64748b;
      user-select: none;
      flex-shrink: 0;
      border-right: 1px solid #334155;
    }

    .diff-added .line-number { color: #4ade80; }
    .diff-removed .line-number { color: #f87171; }

    .line-content {
      padding: 0 1rem;
      white-space: pre;
      flex: 1;
      color: #e2e8f0;
    }

    /* Export info */
    .export-info {
      text-align: center;
      padding: 1rem;
      margin-top: 2rem;
      border-top: 1px solid #334155;
      color: #64748b;
      font-size: 0.75rem;
    }
  </style>
</head>
<body>
  <div class="content">
    ${htmlContent}
  </div>

  <div class="export-info">
    Exported from Redline Review on ${new Date().toLocaleString()}
  </div>

  <!-- Code viewer modal -->
  <div id="modal" class="modal-overlay" onclick="if(event.target === this) closeModal()">
    <div class="modal-content">
      <div class="modal-header">
        <span id="modal-title" class="modal-title"></span>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div id="code-container" class="code-container"></div>
      </div>
    </div>
  </div>

  <script>
    // Embedded code files
    const CODE_FILES = ${JSON.stringify(codeFiles, null, 2)};

    function openCodeViewer(path, lineStart, lineEnd) {
      const file = CODE_FILES[path];
      if (!file) {
        alert('Code file not available: ' + path);
        return;
      }

      const modal = document.getElementById('modal');
      const titleEl = document.getElementById('modal-title');
      const container = document.getElementById('code-container');

      // Set title
      const lineDisplay = lineStart ? (lineEnd ? ':' + lineStart + '-' + lineEnd : ':' + lineStart) : '';
      titleEl.textContent = path + lineDisplay;

      // Render code with line numbers
      const lines = file.content.split('\\n');
      const diff = file.diff || { added_lines: [], removed_lines: [] };

      let html = '';
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const isHighlighted = lineStart && lineNum >= lineStart && lineNum <= (lineEnd || lineStart);
        const isAdded = diff.added_lines && diff.added_lines.includes(lineNum);
        const isRemoved = diff.removed_lines && diff.removed_lines.includes(lineNum);

        let classes = 'code-line';
        if (isHighlighted) classes += ' highlighted';
        if (isAdded) classes += ' diff-added';
        if (isRemoved) classes += ' diff-removed';

        // Escape HTML
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        html += '<div class="' + classes + '">';
        html += '<span class="line-number">' + lineNum + '</span>';
        html += '<span class="line-content">' + (escapedLine || ' ') + '</span>';
        html += '</div>';
      });

      container.innerHTML = html;

      // Show modal
      modal.classList.add('visible');

      // Scroll to highlighted line
      if (lineStart) {
        setTimeout(() => {
          const highlightedLine = container.querySelector('.highlighted');
          if (highlightedLine) {
            highlightedLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('visible');
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`
}

/**
 * Trigger download of the HTML file
 */
export function downloadHtml(htmlContent: string, filename: string = 'review-export.html'): void {
  const blob = new Blob([htmlContent], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
