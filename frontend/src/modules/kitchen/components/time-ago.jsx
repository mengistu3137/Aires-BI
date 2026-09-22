export function TimeAgo({ timestamp, now = Date.now() }) {
  if (!timestamp) return 'just now'

  const deltaMs = Math.max(now - new Date(timestamp).getTime(), 0)
  const deltaMinutes = Math.floor(deltaMs / 60000)

  if (deltaMinutes < 1) return 'just now'
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`

  const hours = Math.floor(deltaMinutes / 60)
  const minutes = deltaMinutes % 60

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
