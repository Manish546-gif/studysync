import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Folder,
  FileText,
  PenTool,
  Trash2,
  Share2,
  X,
  ExternalLink,
  Layers,
  Loader2,
} from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import ShareWhiteboardModal from '../components/whiteboard/ShareWhiteboardModal'
import { SkeletonCard } from '../components/common/Skeleton'
import ConfirmationModal from '../components/common/ConfirmationModal'

function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Color palette available for tagging/organizing boards
const BOARD_COLORS = [
  { name: 'Slate', value: '#64748b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
]

function ColorSwatchPicker({ selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {BOARD_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onSelect(c.value)}
          title={c.name}
          className={`h-7 w-7 rounded-full transition-transform ${
            selected === c.value ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105'
          }`}
          style={{ backgroundColor: c.value }}
        />
      ))}
    </div>
  )
}

function NewBoardModal({ open, onClose, onCreate, creating }) {
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(BOARD_COLORS[0].value)

  useEffect(() => {
    if (open) {
      setTitle('')
      setColor(BOARD_COLORS[0].value)
    }
  }, [open])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">New whiteboard</h2>
            <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled board"
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />

          <label className="mb-2 block text-sm font-medium text-gray-700">Color</label>
          <ColorSwatchPicker selected={color} onSelect={setColor} />

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              disabled={creating}
              onClick={() => onCreate({ title: title.trim() || 'Untitled board', color })}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              <PenTool size={14} />
              Create & open
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function WhiteboardCard({ board, onOpen, onShare, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className="h-24 w-full cursor-pointer"
        style={{ background: `linear-gradient(135deg, ${board.color || '#64748b'}22, ${board.color || '#64748b'}66)` }}
        onClick={() => onOpen(board)}
      >
        <div className="flex h-full items-center justify-center">
          <FileText size={28} style={{ color: board.color || '#64748b' }} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: board.color || '#64748b' }}
          />
          <h3 className="truncate text-sm font-semibold text-gray-900">{board.title || 'Untitled board'}</h3>
        </div>
        <p className="mt-1 text-xs text-gray-400">Edited {timeAgo(board.updatedAt)}</p>

        <div className="mt-3 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onOpen(board)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
          >
            <ExternalLink size={12} /> Open
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onShare(board)}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Share"
            >
              <Share2 size={14} />
            </button>
            <button
              onClick={() => onDelete(board)}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MyWhiteboards() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [shareTarget, setShareTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [activeColorFilter, setActiveColorFilter] = useState(null)

  const loadBoards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/whiteboards')
      setBoards(res.data || [])
    } catch (err) {
      console.error('Failed to load whiteboards', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  const handleCreate = async ({ title, color }) => {
    setCreating(true)
    try {
      const res = await api.post('/whiteboards', { title, color, ownerId: user?.id })
      const board = res.data
      setBoards((prev) => [board, ...prev])
      setShowNewModal(false)
      navigate(`/whiteboards/${board.id}`)
    } catch (err) {
      console.error('Failed to create whiteboard', err)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/whiteboards/${deleteTarget.id}`)
      setBoards((prev) => prev.filter((b) => b.id !== deleteTarget.id))
    } catch (err) {
      console.error('Failed to delete whiteboard', err)
    } finally {
      setDeleteTarget(null)
    }
  }

  const visibleBoards = activeColorFilter
    ? boards.filter((b) => b.color === activeColorFilter)
    : boards

  const usedColors = Array.from(new Set(boards.map((b) => b.color).filter(Boolean)))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Layers className="text-indigo-600" size={22} />
          <h1 className="text-xl font-semibold text-gray-900">My Whiteboards</h1>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus size={16} />
          New board
        </button>
      </div>

      {usedColors.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Filter:</span>
          <button
            onClick={() => setActiveColorFilter(null)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              activeColorFilter === null
                ? 'border-gray-800 text-gray-800'
                : 'border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            All
          </button>
          {usedColors.map((c) => (
            <button
              key={c}
              onClick={() => setActiveColorFilter(c)}
              className={`h-6 w-6 rounded-full transition-transform ${
                activeColorFilter === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : visibleBoards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Folder className="mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">No whiteboards yet</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <PenTool size={14} />
            Create your first board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {visibleBoards.map((board) => (
              <WhiteboardCard
                key={board.id}
                board={board}
                onOpen={(b) => navigate(`/whiteboards/${b.id}`)}
                onShare={setShareTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <NewBoardModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={handleCreate}
        creating={creating}
      />

      {shareTarget && (
        <ShareWhiteboardModal
          board={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmationModal
          title="Delete whiteboard?"
          message={`"${deleteTarget.title}" will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
