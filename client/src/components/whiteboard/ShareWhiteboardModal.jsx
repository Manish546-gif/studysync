import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

const ShareWhiteboard = ({ board, onClose, api }) => {
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [currentBoard, setCurrentBoard] = useState(board)

  const shareUrl = `${window.location.origin}/whiteboards/${board._id}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      setMessage('Failed to copy link')
    }
  }

  const handleShare = async (e) => {
    e.preventDefault()

    if (!email.trim()) {
      setMessage('Please enter an email address')
      return
    }

    setStatus('sharing')
    setMessage('')

    try {
      const data = await api.shareWhiteboard(
        board._id,
        email.trim()
      )

      setCurrentBoard(data.whiteboard)
      setEmail('')
      setMessage(`Shared with ${email.trim()}`)
      setStatus('')
    } catch (err) {
      setMessage(err.message || 'Failed to share whiteboard')
      setStatus('error')
    }
  }

  const handleRemove = async (userId) => {
    try {
      const data = await api.unshareWhiteboard(
        board._id,
        userId
      )

      setCurrentBoard(data.whiteboard)
      setMessage('User removed successfully')
    } catch (err) {
      setMessage(err.message || 'Failed to remove user')
      setStatus('error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 28
        }}
        className="w-full max-w-[28rem] bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
          <div>
            <h3 className="font-display text-base font-bold text-on-surface">
              Share Whiteboard
            </h3>

            <p className="text-xs text-on-surface/40 mt-0.5">
              Invite others to collaborate on "{board.title}"
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">

          {/* Shareable Link */}
          <div>
            <p className="text-xs font-medium text-on-surface/50 mb-2">
              Shareable link
            </p>

            <div className="flex items-center gap-2 bg-surface rounded-xl border border-outline-variant/20 p-2 pl-3">
              <p className="flex-1 text-xs text-on-surface/70 truncate">
                {shareUrl}
              </p>

              <button
                onClick={copyLink}
                className="px-3 py-1.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-semibold hover:shadow-sm transition-shadow shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Share With User */}
          <div>
            <p className="text-xs font-medium text-on-surface/50 mb-2">
              Share with a user
            </p>

            <form
              onSubmit={handleShare}
              className="flex items-center gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user's email"
                disabled={status === 'sharing'}
                className="flex-1 px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={status === 'sharing' || !email.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'sharing' ? 'Sharing...' : 'Share'}
              </button>
            </form>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`text-xs rounded-lg px-3 py-2 ${
                status === 'error'
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-green-500/10 text-green-600'
              }`}
            >
              {message}
            </div>
          )}

          {/* Shared Users */}
          <div>
            <p className="text-xs font-medium text-on-surface/50 mb-2">
              People with access
            </p>

            {currentBoard.sharedWith?.length > 0 ? (
              <div className="space-y-2">
                {currentBoard.sharedWith.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline-variant/20"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {user.name || user.email}
                      </p>

                      {user.name && (
                        <p className="text-xs text-on-surface/40 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemove(user._id)}
                      className="text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-on-surface/40">
                No users have access yet.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ShareWhiteboard
```
