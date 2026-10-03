import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  ArrowRight
} from 'lucide-react'

import { api } from '../services/api'
import Skeleton from '../components/common/Skeleton'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const SESSION_COLORS = [
  'bg-tertiary',
  'bg-primary',
  'bg-secondary',
  'bg-[#FF4262]',
  'bg-green-500'
]

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()

  const mins = Math.floor(diff / 60000)

  if (mins < 1) return 'Just now'

  if (mins < 60) {
    return `${mins}m ago`
  }

  const hours = Math.floor(mins / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)

  if (days < 7) {
    return `${days}d ago`
  }

  return new Date(date).toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  })
}

export default function Calendar() {
  const navigate = useNavigate()

  const today = new Date()

  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState(today.getDate())

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch rooms
  useEffect(() => {
    let mounted = true

    const loadRooms = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await api.getRooms()

        if (mounted) {
          setRooms(data.rooms || [])
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load rooms')
          setRooms([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadRooms()

    return () => {
      mounted = false
    }
  }, [])

  // Number of days in current month
  const daysInMonth = useMemo(() => {
    return new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate()
  }, [currentMonth, currentYear])

  // First day of current month
  const firstDay = useMemo(() => {
    return new Date(
      currentYear,
      currentMonth,
      1
    ).getDay()
  }, [currentMonth, currentYear])

  // Create calendar cells
  const calendarDays = useMemo(() => {
    const days = []

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }, [firstDay, daysInMonth])

  // Go to previous month
  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((year) => year - 1)
    } else {
      setCurrentMonth((month) => month - 1)
    }

    setSelectedDay(1)
  }

  // Go to next month
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((year) => year + 1)
    } else {
      setCurrentMonth((month) => month + 1)
    }

    setSelectedDay(1)
  }

  // Go to today
  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDay(today.getDate())
  }

  // Check whether a date is today
  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  // Get rooms for selected day
  const selectedDate = new Date(
    currentYear,
    currentMonth,
    selectedDay
  )

  const selectedRooms = useMemo(() => {
    return rooms.filter((room) => {
      const date =
        room.updatedAt ||
        room.createdAt ||
        room.startTime

      if (!date) return false

      const roomDate = new Date(date)

      return (
        roomDate.getDate() === selectedDay &&
        roomDate.getMonth() === currentMonth &&
        roomDate.getFullYear() === currentYear
      )
    })
  }, [
    rooms,
    selectedDay,
    currentMonth,
    currentYear
  ])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Calendar
          </h1>

          <p className="text-sm text-on-surface/50 mt-1">
            View your rooms and sessions by date.
          </p>
        </div>

        <button
          onClick={goToToday}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:shadow-md transition-shadow"
        >
          Today
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        {/* Month Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-outline-variant/20">
          <button
            onClick={previousMonth}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>

          <h2 className="font-display font-bold text-lg text-on-surface">
            {MONTHS[currentMonth]} {currentYear}
          </h2>

          <button
            onClick={nextMonth}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 border-b border-outline-variant/20">
          {DAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold text-on-surface/40"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[90px] md:min-h-[120px] border-r border-b border-outline-variant/10"
                />
              )
            }

            const active = selectedDay === day
            const todayCell = isToday(day)

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`
                  min-h-[90px] md:min-h-[120px]
                  p-2 text-left
                  border-r border-b border-outline-variant/10
                  hover:bg-surface-container
                  transition-colors
                  ${active ? 'bg-primary/5' : ''}
                `}
              >
                <div
                  className={`
                    w-7 h-7 flex items-center justify-center
                    rounded-full text-xs font-semibold
                    ${
                      todayCell
                        ? 'bg-primary text-on-primary'
                        : active
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface/70'
                    }
                  `}
                >
                  {day}
                </div>

                {/* Room indicators */}
                <div className="mt-2 space-y-1">
                  {rooms
                    .filter((room) => {
                      const date =
                        room.updatedAt ||
                        room.createdAt ||
                        room.startTime

                      if (!date) return false

                      const roomDate = new Date(date)

                      return (
                        roomDate.getDate() === day &&
                        roomDate.getMonth() === currentMonth &&
                        roomDate.getFullYear() === currentYear
                      )
                    })
                    .slice(0, 2)
                    .map((room, roomIndex) => (
                      <div
                        key={room._id || room.id || roomIndex}
                        className={`
                          h-1.5 rounded-full
                          ${SESSION_COLORS[roomIndex % SESSION_COLORS.length]}
                        `}
                      />
                    ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-on-surface">
              {selectedDate.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h2>

            <p className="text-xs text-on-surface/40 mt-1">
              {selectedRooms.length}{' '}
              {selectedRooms.length === 1
                ? 'room'
                : 'rooms'}
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-4 rounded-xl bg-red-500/10 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          selectedRooms.length === 0 && (
            <div className="py-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
              <p className="text-sm text-on-surface/40">
                No rooms or sessions on this day.
              </p>
            </div>
          )}

        {/* Rooms */}
        {!loading &&
          !error &&
          selectedRooms.length > 0 && (
            <div className="space-y-3">
              {selectedRooms.map((room, index) => (
                <motion.div
                  key={room._id || room.id || index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.05
                  }}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 flex items-center gap-4"
                >
                  <div
                    className={`
                      w-2 self-stretch rounded-full shrink-0
                      ${
                        SESSION_COLORS[
                          index % SESSION_COLORS.length
                        ]
                      }
                    `}
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-on-surface truncate">
                      {room.title ||
                        room.name ||
                        'Untitled Room'}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-on-surface/40">
                      {room.updatedAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {timeAgo(room.updatedAt)}
                        </span>
                      )}

                      {room.members && (
                        <span className="flex items-center gap-1">
                          <Users size={13} />
                          {Array.isArray(room.members)
                            ? room.members.length
                            : room.members}{' '}
                          members
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      navigate(
                        `/rooms/${
                          room._id || room.id
                        }`
                      )
                    }
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors"
                    aria-label="Open room"
                  >
                    <ArrowRight size={16} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
      </div>
    </motion.div>
  )
}
```
