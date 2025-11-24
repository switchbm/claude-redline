import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { CheckCircle, MessageSquare, X, Send } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility function for merging class names
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

interface Comment {
  id: string
  quote: string
  text: string
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
  const popoverRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    const newComment: Comment = {
      id: crypto.randomUUID(),
      quote: selectedText,
      text: commentText.trim(),
      timestamp: Date.now(),
    }

    setComments([...comments, newComment])
    setShowPopover(false)
    setSelectedText('')
    setCommentText('')

    // Clear selection
    window.getSelection()?.removeAllRanges()
  }

  const handleDeleteComment = (id: string) => {
    setComments(comments.filter(c => c.id !== id))
  }

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments }),
      })

      if (response.ok) {
        setSubmitted(true)
        // Try to close the window after a delay
        setTimeout(() => {
          window.close()
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSaveComment()
    }
    if (e.key === 'Escape') {
      setShowPopover(false)
      setSelectedText('')
      setCommentText('')
      window.getSelection()?.removeAllRanges()
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Submitted</h1>
          <p className="text-gray-600">Your feedback has been sent to the AI agent.</p>
          <p className="text-sm text-gray-500 mt-2">You can close this window.</p>
        </div>
      </div>
    )
  }

  if (loading || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Waiting for content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Document Review</h1>
              <p className="text-sm text-gray-600 mt-1">
                Select text to add comments
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquare className="w-4 h-4" />
                <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={comments.length === 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  comments.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
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
            <div className="bg-white rounded-lg shadow-sm p-8 prose prose-lg">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>

          {/* Comments Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Comments</h2>
              {comments.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No comments yet. Select text to add one.
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete comment"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <blockquote className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3 mb-2">
                        "{comment.quote}"
                      </blockquote>
                      <p className="text-sm text-gray-900">{comment.text}</p>
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
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left - 160}px`, // Center the popover
          }}
        >
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Comment
            </label>
            <blockquote className="text-xs text-gray-600 italic border-l-2 border-blue-500 pl-2 mb-3 max-h-20 overflow-y-auto">
              "{selectedText}"
            </blockquote>
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Press Ctrl+Enter to save, Esc to cancel
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveComment}
              disabled={!commentText.trim()}
              className={cn(
                'flex-1 px-3 py-2 rounded-md font-medium text-sm transition-colors',
                commentText.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowPopover(false)
                setSelectedText('')
                setCommentText('')
                window.getSelection()?.removeAllRanges()
              }}
              className="px-3 py-2 rounded-md font-medium text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
