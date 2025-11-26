import { useEffect, useRef, useState, useCallback } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { X, FileCode, Copy, Check, MessageSquare } from 'lucide-react'

interface DiffData {
  added_lines: number[]
  removed_lines: number[]
}

interface CodeComment {
  id: string
  file_path: string
  line_start: number
  line_end: number
  quote: string
  user_comment: string
  timestamp: number
}

interface PendingCodeComment {
  file_path: string
  line_start: number
  line_end: number
  quote: string
}

interface CodeViewerProps {
  filePath: string | null
  lineNumber?: number
  lineEnd?: number
  diffData: Record<string, DiffData>
  onClose: () => void
  onCodeSelection?: (filePath: string, lineStart: number, lineEnd: number, quote: string) => void
  codeComments?: CodeComment[]
  pendingCodeComment?: PendingCodeComment | null
}

interface FileData {
  content: string
  language: string
  lines: number
  path: string
  absolute_path: string
}

export function CodeViewer({
  filePath,
  lineNumber,
  lineEnd,
  diffData,
  onClose,
  onCodeSelection,
  codeComments = [],
  pendingCodeComment
}: CodeViewerProps) {
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const lineRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle text selection in code
  const handleMouseUp = useCallback(() => {
    if (!filePath || !onCodeSelection) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const selectedText = selection.toString().trim()
    if (!selectedText) return

    // Check if selection is within the code container
    const range = selection.getRangeAt(0)
    if (!containerRef.current?.contains(range.commonAncestorContainer)) return

    // Find the line numbers from the selection
    const startContainer = range.startContainer
    const endContainer = range.endContainer

    // Walk up to find line elements
    const findLineNumber = (node: Node): number | null => {
      let current: Node | null = node
      while (current && current !== containerRef.current) {
        if (current instanceof HTMLElement) {
          const lineAttr = current.getAttribute('data-line-number')
          if (lineAttr) return parseInt(lineAttr, 10)
        }
        current = current.parentNode
      }
      return null
    }

    const startLine = findLineNumber(startContainer)
    const endLine = findLineNumber(endContainer)

    if (startLine && endLine) {
      onCodeSelection(filePath, Math.min(startLine, endLine), Math.max(startLine, endLine), selectedText)
      // Clear selection after capturing
      setTimeout(() => selection.removeAllRanges(), 50)
    }
  }, [filePath, onCodeSelection])

  // Check if a line has a comment
  const getLineComment = (lineNum: number): CodeComment | undefined => {
    return codeComments.find(c => lineNum >= c.line_start && lineNum <= c.line_end)
  }

  // Check if a line is pending comment
  const isLinePending = (lineNum: number): boolean => {
    if (!pendingCodeComment) return false
    return lineNum >= pendingCodeComment.line_start && lineNum <= pendingCodeComment.line_end
  }

  // Fetch file content when filePath changes
  useEffect(() => {
    if (!filePath) {
      setFileData(null)
      return
    }

    const fetchFile = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        if (response.ok) {
          const data = await response.json()
          setFileData(data)
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load file')
        }
      } catch (err) {
        setError('Failed to fetch file')
        console.error('Error fetching file:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFile()
  }, [filePath])

  // Scroll to line when fileData loads or lineNumber changes
  useEffect(() => {
    if (fileData && lineNumber && lineRef.current && containerRef.current) {
      // Small delay to ensure the DOM is rendered
      setTimeout(() => {
        lineRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 100)
    }
  }, [fileData, lineNumber])

  const handleCopy = async () => {
    if (!fileData) return

    try {
      await navigator.clipboard.writeText(fileData.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Get diff data for this file
  const fileDiff = filePath ? diffData[filePath] : null

  // Map language names for prism
  const languageMap: Record<string, string> = {
    'typescript': 'tsx',
    'javascript': 'jsx',
    'python': 'python',
    'rust': 'rust',
    'go': 'go',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'css': 'css',
    'html': 'markup',
    'json': 'json',
    'yaml': 'yaml',
    'markdown': 'markdown',
    'bash': 'bash',
    'sql': 'sql',
    'ruby': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'scala': 'scala',
    'toml': 'toml',
    'text': 'text',
  }

  if (!filePath) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="text-center p-8">
          <FileCode
            className="w-16 h-16 mx-auto mb-4 opacity-30"
            style={{ color: 'var(--text-muted)' }}
          />
          <p style={{ color: 'var(--text-muted)' }}>
            Click a code reference to view the file
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--accent-primary)' }}
          />
          <p style={{ color: 'var(--text-secondary)' }}>Loading file...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="text-center p-8">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-error)', opacity: 0.1 }}
          >
            <X className="w-8 h-8" style={{ color: 'var(--accent-error)' }} />
          </div>
          <p className="font-medium" style={{ color: 'var(--accent-error)' }}>
            {error}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {filePath}
          </p>
        </div>
      </div>
    )
  }

  if (!fileData) {
    return null
  }

  const prismLanguage = languageMap[fileData.language] || 'text'

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--bg-card-hover)',
          borderColor: 'var(--border-default)'
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileCode className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
          <div className="min-w-0">
            <h3
              className="font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
              title={fileData.absolute_path}
            >
              {fileData.path}
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {fileData.lines} lines
              {lineNumber && (
                <span style={{ color: 'var(--accent-primary)' }}>
                  {' '}&bull; Line {lineNumber}{lineEnd && lineEnd !== lineNumber ? `-${lineEnd}` : ''}
                </span>
              )}
              {fileDiff && fileDiff.added_lines.length > 0 && (
                <span style={{ color: 'var(--accent-success)' }}>
                  {' '}&bull; +{fileDiff.added_lines.length} added
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Copy file contents"
          >
            {copied ? (
              <Check className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ backgroundColor: '#1e1e1e' }}
        onMouseUp={handleMouseUp}
      >
        <Highlight
          theme={themes.vsDark}
          code={fileData.content}
          language={prismLanguage}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} text-sm`}
              style={{
                ...style,
                margin: 0,
                padding: '1rem 0',
                minHeight: '100%',
              }}
            >
              {tokens.map((line, i) => {
                const lineNum = i + 1
                const isTargetLine = lineNumber !== undefined && (
                  lineEnd
                    ? lineNum >= lineNumber && lineNum <= lineEnd
                    : lineNum === lineNumber
                )
                const isAddedLine = fileDiff?.added_lines.includes(lineNum)
                const lineComment = getLineComment(lineNum)
                const isPending = isLinePending(lineNum)

                // Determine line highlighting priority: pending > comment > target > diff
                const getLineBackground = () => {
                  if (isPending) return 'rgba(254, 240, 138, 0.3)' // yellow for pending
                  if (lineComment) return 'rgba(254, 240, 138, 0.2)' // lighter yellow for commented
                  if (isTargetLine) return 'rgba(255, 213, 79, 0.15)'
                  if (isAddedLine) return 'rgba(46, 160, 67, 0.2)'
                  return 'transparent'
                }

                const getLineBorder = () => {
                  if (isPending) return '3px solid #fbbf24' // amber for pending
                  if (lineComment) return '3px solid #f59e0b' // orange for commented
                  if (isTargetLine) return '3px solid #ffd54f'
                  if (isAddedLine) return '3px solid #2ea043'
                  return '3px solid transparent'
                }

                return (
                  <div
                    data-line-number={lineNum}
                    key={i}
                    ref={isTargetLine && lineNum === lineNumber ? lineRef : null}
                    {...getLineProps({ line })}
                    style={{
                      display: 'flex',
                      backgroundColor: getLineBackground(),
                      borderLeft: getLineBorder(),
                      animation: isPending ? 'pulse-code 1.5s ease-in-out infinite' : undefined,
                    }}
                    title={lineComment ? `Comment: ${lineComment.user_comment}` : undefined}
                  >
                    {/* Line number */}
                    <span
                      style={{
                        display: 'inline-block',
                        width: '3.5rem',
                        textAlign: 'right',
                        paddingRight: '1rem',
                        color: isPending || lineComment
                          ? '#fbbf24'
                          : isTargetLine
                            ? '#ffd54f'
                            : '#858585',
                        userSelect: 'none',
                        flexShrink: 0,
                      }}
                    >
                      {lineNum}
                    </span>
                    {/* Comment/Diff indicator */}
                    <span
                      style={{
                        display: 'inline-block',
                        width: '1.5rem',
                        textAlign: 'center',
                        userSelect: 'none',
                        flexShrink: 0,
                      }}
                    >
                      {lineComment ? (
                        <MessageSquare
                          className="w-3 h-3 inline"
                          style={{ color: '#f59e0b' }}
                        />
                      ) : isAddedLine ? (
                        <span style={{ color: '#2ea043' }}>+</span>
                      ) : (
                        ' '
                      )}
                    </span>
                    {/* Code content */}
                    <span style={{ flex: 1, paddingRight: '1rem' }}>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                )
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  )
}
