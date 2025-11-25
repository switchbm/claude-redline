import { useEffect, useRef, useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { X, FileCode, Copy, Check } from 'lucide-react'

interface DiffData {
  added_lines: number[]
  removed_lines: number[]
}

interface CodeViewerProps {
  filePath: string | null
  lineNumber?: number
  lineEnd?: number
  diffData: Record<string, DiffData>
  onClose: () => void
}

interface FileData {
  content: string
  language: string
  lines: number
  path: string
  absolute_path: string
}

export function CodeViewer({ filePath, lineNumber, lineEnd, diffData, onClose }: CodeViewerProps) {
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const lineRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

                return (
                  <div
                    key={i}
                    ref={isTargetLine && lineNum === lineNumber ? lineRef : null}
                    {...getLineProps({ line })}
                    style={{
                      display: 'flex',
                      backgroundColor: isTargetLine
                        ? 'rgba(255, 213, 79, 0.15)'
                        : isAddedLine
                          ? 'rgba(46, 160, 67, 0.2)'
                          : 'transparent',
                      borderLeft: isTargetLine
                        ? '3px solid #ffd54f'
                        : isAddedLine
                          ? '3px solid #2ea043'
                          : '3px solid transparent',
                    }}
                  >
                    {/* Line number */}
                    <span
                      style={{
                        display: 'inline-block',
                        width: '3.5rem',
                        textAlign: 'right',
                        paddingRight: '1rem',
                        color: isTargetLine ? '#ffd54f' : '#858585',
                        userSelect: 'none',
                        flexShrink: 0,
                      }}
                    >
                      {lineNum}
                    </span>
                    {/* Diff indicator */}
                    <span
                      style={{
                        display: 'inline-block',
                        width: '1rem',
                        textAlign: 'center',
                        color: isAddedLine ? '#2ea043' : 'transparent',
                        userSelect: 'none',
                        flexShrink: 0,
                      }}
                    >
                      {isAddedLine ? '+' : ' '}
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
