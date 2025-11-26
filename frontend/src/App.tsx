import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { CheckCircle, MessageSquare, X, Send, Edit2, FileText, GripVertical, Code, FileCode } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CodeViewer } from './components/CodeViewer'

// Utility function for merging class names
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

interface Comment {
  id: string
  quote: string
  full_line_text: string
  user_comment: string
  timestamp: number
  context: string  // Surrounding context to uniquely identify this occurrence
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

interface CodeReference {
  filePath: string
  lineNumber?: number
  lineEnd?: number
}

interface DiffData {
  added_lines: number[]
  removed_lines: number[]
}

// Code reference button component
interface CodeRefButtonProps {
  filePath: string
  lineNumber?: number
  lineEnd?: number
  onClick: (ref: CodeReference) => void
}

function CodeRefButton({ filePath, lineNumber, lineEnd, onClick }: CodeRefButtonProps) {
  const lineDisplay = lineNumber
    ? lineEnd
      ? `:${lineNumber}-${lineEnd}`
      : `:${lineNumber}`
    : ''

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick({ filePath, lineNumber, lineEnd })
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-mono transition-all hover:scale-105"
      style={{
        backgroundColor: 'var(--accent-primary)',
        color: 'var(--text-inverse)',
      }}
      title={`View ${filePath}${lineDisplay}`}
    >
      <Code className="w-3 h-3" />
      {filePath}{lineDisplay}
    </button>
  )
}

// Parse text and replace [[file:...]] with CodeRefButton components
function parseTextWithCodeRefs(
  text: string,
  onCodeRefClick: (ref: CodeReference) => void
): ReactNode[] {
  const codeRefRegex = /\[\[file:([^:\]]+)(?::(\d+)(?:-(\d+))?)?\]\]/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = codeRefRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Add the code reference button
    const [, path, line, lineEnd] = match
    parts.push(
      <CodeRefButton
        key={`coderef-${match.index}`}
        filePath={path}
        lineNumber={line ? parseInt(line, 10) : undefined}
        lineEnd={lineEnd ? parseInt(lineEnd, 10) : undefined}
        onClick={onCodeRefClick}
      />
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

function App() {
  const [content, setContent] = useState<string>('')
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [selectedText, setSelectedText] = useState<string>('')
  const [showPopover, setShowPopover] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [overallComment, setOverallComment] = useState('')
  const [contentWithHighlights, setContentWithHighlights] = useState<string>('')
  const [pendingHighlight, setPendingHighlight] = useState<{text: string, context: string} | null>(null)

  // Code comments state
  const [codeComments, setCodeComments] = useState<CodeComment[]>([])
  const [pendingCodeComment, setPendingCodeComment] = useState<PendingCodeComment | null>(null)
  const [codeCommentText, setCodeCommentText] = useState('')
  const [showCodeCommentInput, setShowCodeCommentInput] = useState(false)

  // Code viewer state
  const [selectedCodeRef, setSelectedCodeRef] = useState<CodeReference | null>(null)
  const [showCodeViewer, setShowCodeViewer] = useState(false)
  const [diffData, setDiffData] = useState<Record<string, DiffData>>({})
  const [splitPosition, setSplitPosition] = useState(60) // percentage
  const [isDragging, setIsDragging] = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle code reference click
  const handleCodeRefClick = useCallback((ref: CodeReference) => {
    setSelectedCodeRef(ref)
    setShowCodeViewer(true)
  }, [])

  // Fetch content from backend
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/content')
        if (response.ok) {
          const data = await response.json()
          if (data.content) {
            setContent(data.content)
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Error fetching content:', error)
      }
    }

    // Poll for content
    const interval = setInterval(fetchContent, 1000)
    fetchContent()

    return () => clearInterval(interval)
  }, [])

  // Fetch diff data
  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const response = await fetch('/api/diff')
        if (response.ok) {
          const data = await response.json()
          setDiffData(data.diff || {})
        }
      } catch (error) {
        console.error('Error fetching diff:', error)
      }
    }

    fetchDiff()
  }, [])

  // Generate highlighted content when comments or pending highlight change
  useEffect(() => {
    if (!content) return

    let highlightedContent = content

    // Sort comments by context length (longest first) to avoid nested replacements
    const sortedComments = [...comments].sort((a, b) => (b.context?.length || 0) - (a.context?.length || 0))

    sortedComments.forEach((comment) => {
      const escapedText = comment.quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Use context-based matching if available, otherwise fall back to global
      if (comment.context) {
        const escapedContext = comment.context.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const contextRegex = new RegExp(`(${escapedContext})`)
        highlightedContent = highlightedContent.replace(contextRegex, (match) => {
          return match.replace(
            new RegExp(`(${escapedText})`),
            `<mark class="theme-highlight cursor-pointer" data-comment-id="${comment.id}" title="Click to view comment">$1</mark>`
          )
        })
      } else {
        // Fallback for comments without context (legacy)
        const regex = new RegExp(`(${escapedText})`, 'g')
        highlightedContent = highlightedContent.replace(
          regex,
          `<mark class="theme-highlight cursor-pointer" data-comment-id="${comment.id}" title="Click to view comment">$1</mark>`
        )
      }
    })

    // Add pending highlight (temporary highlight while comment box is open)
    // Use context to match only the specific occurrence, not all occurrences
    if (pendingHighlight && !comments.some(c => c.quote === pendingHighlight.text && c.context === pendingHighlight.context)) {
      const escapedContext = pendingHighlight.context.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const escapedText = pendingHighlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Replace the text within its context (only first match of the full context)
      const contextRegex = new RegExp(`(${escapedContext})`)
      highlightedContent = highlightedContent.replace(contextRegex, (match) => {
        // Within the matched context, wrap just the selected text
        return match.replace(
          new RegExp(`(${escapedText})`),
          `<mark class="theme-highlight-pending cursor-pointer">$1</mark>`
        )
      })
    }

    setContentWithHighlights(highlightedContent)
  }, [content, comments, pendingHighlight])

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        return
      }

      const text = selection.toString().trim()
      if (!text) {
        return
      }

      // Check if selection is inside the popover (ignore if so)
      if (popoverRef.current?.contains(selection.anchorNode)) {
        return
      }

      const range = selection.getRangeAt(0)

      // Get surrounding context to uniquely identify this occurrence
      // Capture ~30 chars before and after the selection
      const container = range.commonAncestorContainer
      const fullText = container.textContent || ''
      const startOffset = range.startOffset
      const endOffset = range.endOffset

      // Get context: 30 chars before + selected text + 30 chars after
      const contextStart = Math.max(0, startOffset - 30)
      const contextEnd = Math.min(fullText.length, endOffset + 30)
      const context = fullText.slice(contextStart, contextEnd)

      // Show comment input in sidebar
      setSelectedText(text)
      setPendingHighlight({ text, context })
      setShowPopover(true)
      setCommentText('')

      // Clear native selection so our React highlight is visible
      setTimeout(() => {
        window.getSelection()?.removeAllRanges()
        textareaRef.current?.focus()
      }, 50)
    }

    document.addEventListener('mouseup', handleSelection)
    return () => document.removeEventListener('mouseup', handleSelection)
  }, [])

  // Handle click outside popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        showPopover
      ) {
        // Clear selection and pending highlight
        window.getSelection()?.removeAllRanges()
        setShowPopover(false)
        setSelectedText('')
        setCommentText('')
        setPendingHighlight(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPopover])

  // Handle split pane dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100

    // Clamp between 30% and 80%
    setSplitPosition(Math.max(30, Math.min(80, newPosition)))
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleSaveComment = () => {
    if (!commentText.trim()) {
      return
    }

    if (editingCommentId) {
      // Update existing comment
      setComments(comments.map(c =>
        c.id === editingCommentId
          ? { ...c, user_comment: commentText.trim() }
          : c
      ))
      setEditingCommentId(null)
    } else {
      // Add new comment - find the full line containing the quote
      const lines = content.split('\n')
      const fullLine = lines.find(line => line.includes(selectedText)) || selectedText

      const newComment: Comment = {
        id: crypto.randomUUID(),
        quote: selectedText,
        full_line_text: fullLine,
        user_comment: commentText.trim(),
        timestamp: Date.now(),
        context: pendingHighlight?.context || '',  // Store context for unique matching
      }
      setComments([...comments, newComment])
    }

    setShowPopover(false)
    setSelectedText('')
    setCommentText('')
    setPendingHighlight(null)

    // Clear selection
    window.getSelection()?.removeAllRanges()
  }

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setSelectedText(comment.quote)
    setCommentText(comment.user_comment)
    setShowPopover(true)

    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  const handleDeleteComment = (id: string) => {
    setComments(comments.filter(c => c.id !== id))
  }

  // Code comment handlers
  const handleCodeSelection = (filePath: string, lineStart: number, lineEnd: number, quote: string) => {
    setPendingCodeComment({ file_path: filePath, line_start: lineStart, line_end: lineEnd, quote })
    setShowCodeCommentInput(true)
    setCodeCommentText('')
  }

  const handleSaveCodeComment = () => {
    if (!codeCommentText.trim() || !pendingCodeComment) return

    const newCodeComment: CodeComment = {
      id: crypto.randomUUID(),
      file_path: pendingCodeComment.file_path,
      line_start: pendingCodeComment.line_start,
      line_end: pendingCodeComment.line_end,
      quote: pendingCodeComment.quote,
      user_comment: codeCommentText.trim(),
      timestamp: Date.now(),
    }
    setCodeComments([...codeComments, newCodeComment])
    setShowCodeCommentInput(false)
    setPendingCodeComment(null)
    setCodeCommentText('')
  }

  const handleCancelCodeComment = () => {
    setShowCodeCommentInput(false)
    setPendingCodeComment(null)
    setCodeCommentText('')
  }

  const handleDeleteCodeComment = (id: string) => {
    setCodeComments(codeComments.filter(c => c.id !== id))
  }

  const handleSubmit = () => {
    setShowSubmitModal(true)
    setTimeout(() => {
      modalTextareaRef.current?.focus()
    }, 100)
  }

  const handleFinalSubmit = async () => {
    try {
      // Auto-populate "LGTM" if no comments and no overall comment
      const finalOverallComment =
        (comments.length === 0 && codeComments.length === 0 && !overallComment.trim())
          ? 'LGTM'
          : (overallComment.trim() || null)

      const payload = {
        comments,
        code_comments: codeComments,
        user_overall_comment: finalOverallComment,
      }

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setSubmitted(true)
        setShowSubmitModal(false)
        // Try to close the window after a delay
        setTimeout(() => {
          window.close()
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const handleCancelEdit = () => {
    setShowPopover(false)
    setEditingCommentId(null)
    setSelectedText('')
    setCommentText('')
    setPendingHighlight(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSaveComment()
    }
    if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleFinalSubmit()
    }
  }

  const handleCloseCodeViewer = () => {
    setShowCodeViewer(false)
    setSelectedCodeRef(null)
  }

  // Custom markdown components that handle code references
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createTextRenderer = (Component: React.ElementType): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({ children, ...props }: any) => {
      if (typeof children === 'string') {
        const parsed = parseTextWithCodeRefs(children, handleCodeRefClick)
        if (parsed.length === 1 && typeof parsed[0] === 'string') {
          return <Component {...props}>{children}</Component>
        }
        return <Component {...props}>{parsed}</Component>
      }
      return <Component {...props}>{children}</Component>
    }
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-page)' }}
      >
        <div className="text-center">
          <CheckCircle
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: 'var(--accent-success)' }}
          />
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Review Submitted
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Your feedback has been sent to the AI agent.
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: 'var(--text-muted)' }}
          >
            You can close this window.
          </p>
        </div>
      </div>
    )
  }

  if (loading || !content) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-page)' }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--accent-primary)' }}
          />
          <p style={{ color: 'var(--text-secondary)' }}>Waiting for content...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 border-b z-10"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Document Review
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Select text to add comments {showCodeViewer ? '' : '| Click code references to view files'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {showCodeViewer && (
                <button
                  onClick={handleCloseCodeViewer}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <X className="w-4 h-4" />
                  Close Code
                </button>
              )}
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
              </div>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-inverse)'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
              >
                <Send className="w-4 h-4" />
                Submit Review
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Review Document */}
        <div
          className="overflow-auto"
          style={{
            width: showCodeViewer ? `${splitPosition}%` : '100%',
            transition: isDragging ? 'none' : 'width 0.2s ease'
          }}
        >
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Markdown Content */}
              <div className="lg:col-span-2">
                <div
                  className="rounded-lg p-8 prose prose-lg max-w-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      // Handle text in paragraphs
                      p: createTextRenderer('p'),
                      // Handle text in list items
                      li: createTextRenderer('li'),
                      // Handle text in headings
                      h1: createTextRenderer('h1'),
                      h2: createTextRenderer('h2'),
                      h3: createTextRenderer('h3'),
                      h4: createTextRenderer('h4'),
                      h5: createTextRenderer('h5'),
                      h6: createTextRenderer('h6'),
                      // Handle text in table cells
                      td: createTextRenderer('td'),
                      th: createTextRenderer('th'),
                      // Handle text in blockquotes
                      blockquote: createTextRenderer('blockquote'),
                      // Allow mark elements for highlighting
                      mark: ({ children, ...props }) => (
                        <mark
                          {...props}
                          className="px-1 rounded cursor-pointer transition-colors theme-highlight"
                        >
                          {children}
                        </mark>
                      ),
                      // Regular inline code (not code references)
                      code: ({ children, className, ...props }) => {
                        // Check if this is inside a pre tag (code block)
                        const isBlock = className?.includes('language-')
                        if (isBlock) {
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          )
                        }
                        return (
                          <code
                            {...props}
                            className={cn(
                              className,
                              'px-1.5 py-0.5 rounded text-sm'
                            )}
                            style={{
                              backgroundColor: 'var(--bg-card-hover)',
                              color: 'var(--accent-primary)'
                            }}
                          >
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {contentWithHighlights || content}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Comments Sidebar */}
              <div className="lg:col-span-1">
                <div
                  className="rounded-lg p-4 sticky top-24"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <h2
                    className="text-base font-bold mb-3"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Comments
                  </h2>

                  {/* Inline Comment Input (shown when text is selected) */}
                  {showPopover && (
                    <div
                      className="border rounded-lg p-3 mb-4"
                      style={{
                        borderColor: 'var(--accent-primary)',
                        backgroundColor: 'var(--bg-page)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {editingCommentId ? 'Edit Comment' : 'New Comment'}
                        </span>
                        <button
                          onClick={handleCancelEdit}
                          className="text-xs transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <blockquote
                        className="text-xs italic border-l-2 pl-2 mb-2 py-1 max-h-16 overflow-y-auto"
                        style={{
                          color: 'var(--text-secondary)',
                          borderColor: 'var(--accent-warning)',
                          backgroundColor: 'var(--bg-highlight)'
                        }}
                      >
                        "{selectedText}"
                      </blockquote>
                      <textarea
                        ref={textareaRef}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add your comment..."
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:border-transparent resize-none"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                        rows={2}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleSaveComment}
                          disabled={!commentText.trim()}
                          className="flex-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: commentText.trim() ? 'var(--accent-primary)' : 'var(--border-default)',
                            color: commentText.trim() ? 'var(--text-inverse)' : 'var(--text-muted)',
                            cursor: commentText.trim() ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {editingCommentId ? 'Update' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 rounded text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: 'var(--bg-card-hover)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Code Comment Input (shown when code is selected) */}
                  {showCodeCommentInput && pendingCodeComment && (
                    <div
                      className="border rounded-lg p-3 mb-4"
                      style={{
                        borderColor: '#f59e0b',
                        backgroundColor: 'var(--bg-page)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-xs font-medium flex items-center gap-1"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <FileCode className="w-3 h-3" />
                          Code Comment
                        </span>
                        <button
                          onClick={handleCancelCodeComment}
                          className="text-xs transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div
                        className="text-xs mb-2 px-2 py-1 rounded font-mono"
                        style={{
                          backgroundColor: '#1e1e1e',
                          color: '#d4d4d4'
                        }}
                      >
                        <div style={{ color: '#858585' }}>
                          {pendingCodeComment.file_path}:{pendingCodeComment.line_start}
                          {pendingCodeComment.line_end !== pendingCodeComment.line_start && `-${pendingCodeComment.line_end}`}
                        </div>
                        <div className="max-h-16 overflow-y-auto whitespace-pre-wrap break-all">
                          {pendingCodeComment.quote.slice(0, 200)}{pendingCodeComment.quote.length > 200 ? '...' : ''}
                        </div>
                      </div>
                      <textarea
                        value={codeCommentText}
                        onChange={(e) => setCodeCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault()
                            handleSaveCodeComment()
                          } else if (e.key === 'Escape') {
                            handleCancelCodeComment()
                          }
                        }}
                        placeholder="Add your code comment..."
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:border-transparent resize-none"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleSaveCodeComment}
                          disabled={!codeCommentText.trim()}
                          className="flex-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: codeCommentText.trim() ? '#f59e0b' : 'var(--border-default)',
                            color: codeCommentText.trim() ? 'white' : 'var(--text-muted)',
                            cursor: codeCommentText.trim() ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelCodeComment}
                          className="px-2 py-1 rounded text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: 'var(--bg-card-hover)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {comments.length === 0 && codeComments.length === 0 && !showPopover && !showCodeCommentInput ? (
                    <p
                      className="text-sm italic"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      No comments yet. Select text to add one.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Document Comments */}
                      {comments.map((comment, index) => (
                        <div
                          key={comment.id}
                          className="border rounded-lg p-3 transition-shadow hover:shadow-md overflow-hidden"
                          style={{ borderColor: 'var(--border-default)' }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <MessageSquare
                                className="w-4 h-4"
                                style={{ color: 'var(--accent-primary)' }}
                              />
                              <span
                                className="text-xs"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                #{index + 1}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditComment(comment)}
                                className="transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                title="Edit comment"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                title="Delete comment"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <blockquote
                            className="text-xs italic border-l-2 pl-2 mb-2 py-1 rounded break-words"
                            style={{
                              color: 'var(--text-secondary)',
                              borderColor: 'var(--accent-warning)',
                              backgroundColor: 'var(--bg-highlight)',
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere'
                            }}
                          >
                            "{comment.quote}"
                          </blockquote>
                          <p
                            className="text-xs break-words"
                            style={{
                              color: 'var(--text-primary)',
                              wordBreak: 'break-word'
                            }}
                          >
                            {comment.user_comment}
                          </p>
                        </div>
                      ))}

                      {/* Code Comments */}
                      {codeComments.map((codeComment, index) => (
                        <div
                          key={codeComment.id}
                          className="border rounded-lg p-3 transition-shadow hover:shadow-md overflow-hidden"
                          style={{ borderColor: '#f59e0b' }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileCode
                                className="w-4 h-4"
                                style={{ color: '#f59e0b' }}
                              />
                              <span
                                className="text-xs"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Code #{index + 1}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteCodeComment(codeComment.id)}
                              className="transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                              title="Delete code comment"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div
                            className="text-xs mb-2 px-2 py-1 rounded font-mono break-words"
                            style={{
                              backgroundColor: '#1e1e1e',
                              color: '#858585',
                              wordBreak: 'break-word'
                            }}
                          >
                            {codeComment.file_path}:{codeComment.line_start}
                            {codeComment.line_end !== codeComment.line_start && `-${codeComment.line_end}`}
                          </div>
                          <p
                            className="text-xs break-words"
                            style={{
                              color: 'var(--text-primary)',
                              wordBreak: 'break-word'
                            }}
                          >
                            {codeComment.user_comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        {showCodeViewer && (
          <div
            className="w-1 cursor-col-resize flex items-center justify-center hover:bg-opacity-50 transition-colors"
            style={{
              backgroundColor: isDragging ? 'var(--accent-primary)' : 'var(--border-default)'
            }}
            onMouseDown={() => setIsDragging(true)}
          >
            <GripVertical
              className="w-4 h-4"
              style={{ color: 'var(--text-muted)' }}
            />
          </div>
        )}

        {/* Right Panel: Code Viewer */}
        {showCodeViewer && (
          <div
            className="overflow-hidden border-l"
            style={{
              width: `${100 - splitPosition}%`,
              borderColor: 'var(--border-default)',
              transition: isDragging ? 'none' : 'width 0.2s ease'
            }}
          >
            <CodeViewer
              filePath={selectedCodeRef?.filePath || null}
              lineNumber={selectedCodeRef?.lineNumber}
              lineEnd={selectedCodeRef?.lineEnd}
              diffData={diffData}
              onClose={handleCloseCodeViewer}
              onCodeSelection={handleCodeSelection}
              codeComments={codeComments.filter(c => c.file_path === selectedCodeRef?.filePath)}
              pendingCodeComment={pendingCodeComment?.file_path === selectedCodeRef?.filePath ? pendingCodeComment : null}
            />
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="rounded-lg max-w-2xl w-full p-6"
            style={{
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <FileText
                className="w-6 h-6 mt-1"
                style={{ color: 'var(--accent-primary)' }}
              />
              <div className="flex-1">
                <h2
                  className="text-xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Submit Review
                </h2>
                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {comments.length > 0
                    ? `You have ${comments.length} inline comment${comments.length === 1 ? '' : 's'}.`
                    : 'No inline comments added.'}
                  {' '}Add an optional overall summary below.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Overall Comment (Optional)
              </label>
              <textarea
                ref={modalTextareaRef}
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                onKeyDown={handleModalKeyDown}
                placeholder="Add a summary comment about the entire document, or leave blank if everything looks good..."
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
                rows={5}
              />
              <p
                className="text-xs mt-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Press Ctrl+Enter to submit - This comment covers the entire review
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--bg-card-hover)',
                  color: 'var(--text-secondary)'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-default)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
              >
                Cancel
              </button>
              <button
                onClick={handleFinalSubmit}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-inverse)'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
              >
                <Send className="w-4 h-4" />
                {comments.length === 0 && !overallComment.trim()
                  ? 'Approve (No Comments)'
                  : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
