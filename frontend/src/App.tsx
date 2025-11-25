import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { CheckCircle, MessageSquare, X, Send, Edit2, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
}

interface PopoverPosition {
  top: number
  left: number
}

function App() {
  const [content, setContent] = useState<string>('')
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [selectedText, setSelectedText] = useState<string>('')
  const [showPopover, setShowPopover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({ top: 0, left: 0 })
  const [commentText, setCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [overallComment, setOverallComment] = useState('')
  const [contentWithHighlights, setContentWithHighlights] = useState<string>('')
  const popoverRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Generate highlighted content when comments change
  useEffect(() => {
    if (!content) return

    let highlightedContent = content

    // Sort comments by quote length (longest first) to avoid nested replacements
    const sortedComments = [...comments].sort((a, b) => b.quote.length - a.quote.length)

    sortedComments.forEach((comment) => {
      const escapedQuote = comment.quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(${escapedQuote})`, 'g')

      // Wrap the quote with a special marker using theme highlight class
      highlightedContent = highlightedContent.replace(
        regex,
        `<mark class="theme-highlight cursor-pointer" data-comment-id="${comment.id}" title="Click to view comment">$1</mark>`
      )
    })

    setContentWithHighlights(highlightedContent)
  }, [content, comments])

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
      const rect = range.getBoundingClientRect()

      // Position popover near the selection
      setSelectedText(text)
      setPopoverPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX + rect.width / 2,
      })
      setShowPopover(true)
      setCommentText('')

      // Focus textarea after a short delay
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
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
        // Clear selection
        window.getSelection()?.removeAllRanges()
        setShowPopover(false)
        setSelectedText('')
        setCommentText('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPopover])

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
      }
      setComments([...comments, newComment])
    }

    setShowPopover(false)
    setSelectedText('')
    setCommentText('')

    // Clear selection
    window.getSelection()?.removeAllRanges()
  }

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setSelectedText(comment.quote)
    setCommentText(comment.user_comment)
    setShowPopover(true)

    // Position popover in center of screen for editing
    setPopoverPosition({
      top: window.scrollY + window.innerHeight / 2 - 150,
      left: window.scrollX + window.innerWidth / 2,
    })

    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  const handleDeleteComment = (id: string) => {
    setComments(comments.filter(c => c.id !== id))
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
        (comments.length === 0 && !overallComment.trim())
          ? 'LGTM'
          : (overallComment.trim() || null)

      const payload = {
        comments,
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
      className="min-h-screen"
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
        <div className="max-w-4xl mx-auto px-6 py-4">
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
                Select text to add comments
              </p>
            </div>
            <div className="flex items-center gap-4">
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Markdown Content */}
          <div className="lg:col-span-2">
            <div
              className="rounded-lg p-8 prose prose-lg"
              style={{
                backgroundColor: 'var(--bg-card)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <ReactMarkdown
                components={{
                  // Allow mark elements for highlighting
                  mark: ({ children, ...props }) => (
                    <mark
                      {...props}
                      className="px-1 rounded cursor-pointer transition-colors theme-highlight"
                    >
                      {children}
                    </mark>
                  ),
                }}
              >
                {contentWithHighlights || content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Comments Sidebar */}
          <div className="lg:col-span-1">
            <div
              className="rounded-lg p-6 sticky top-24"
              style={{
                backgroundColor: 'var(--bg-card)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Comments
              </h2>
              {comments.length === 0 ? (
                <p
                  className="text-sm italic"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No comments yet. Select text to add one.
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      className="border rounded-lg p-4 transition-shadow hover:shadow-md"
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
                        className="text-sm italic border-l-2 pl-3 mb-2 py-1 rounded"
                        style={{
                          color: 'var(--text-secondary)',
                          borderColor: 'var(--accent-warning)',
                          backgroundColor: 'var(--bg-highlight)'
                        }}
                      >
                        "{comment.quote}"
                      </blockquote>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {comment.user_comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comment Popover */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="fixed z-50 rounded-lg border p-4 w-80"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left - 160}px`,
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-default)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {editingCommentId ? 'Edit Comment' : 'Add Comment'}
            </label>
            <blockquote
              className="text-xs italic border-l-2 pl-2 mb-3 max-h-20 overflow-y-auto"
              style={{
                color: 'var(--text-secondary)',
                borderColor: 'var(--accent-primary)'
              }}
            >
              "{selectedText}"
            </blockquote>
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your comment..."
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent resize-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
              rows={3}
            />
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Press Ctrl+Enter to save, Esc to cancel
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveComment}
              disabled={!commentText.trim()}
              className={cn(
                'flex-1 px-3 py-2 rounded-md font-medium text-sm transition-colors',
              )}
              style={{
                backgroundColor: commentText.trim() ? 'var(--accent-primary)' : 'var(--border-default)',
                color: commentText.trim() ? 'var(--text-inverse)' : 'var(--text-muted)',
                cursor: commentText.trim() ? 'pointer' : 'not-allowed'
              }}
              onMouseOver={(e) => {
                if (commentText.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)'
                }
              }}
              onMouseOut={(e) => {
                if (commentText.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--accent-primary)'
                }
              }}
            >
              {editingCommentId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-2 rounded-md font-medium text-sm transition-colors"
              style={{
                backgroundColor: 'var(--bg-card-hover)',
                color: 'var(--text-secondary)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-default)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
