import { differenceInHours, differenceInMinutes, format } from 'date-fns'

export default function SlaTimer({ deadline, breached, compact = false }) {
  if (!deadline) return <span className="text-gray-600 text-xs">—</span>

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const hoursLeft = differenceInHours(deadlineDate, now)
  const minutesLeft = differenceInMinutes(deadlineDate, now)

  let cls, label
  if (breached || hoursLeft < 0) {
    const overdue = Math.abs(hoursLeft)
    cls = 'sla-breach'
    label = compact ? `⚠️ ${overdue}h over` : `Overdue by ${overdue}h`
  } else if (hoursLeft < 2) {
    cls = 'sla-warn'
    label = compact ? `⚡ ${minutesLeft}m` : `${minutesLeft} minutes left`
  } else if (hoursLeft < 24) {
    cls = 'sla-warn'
    label = compact ? `${hoursLeft}h left` : `${hoursLeft} hours left`
  } else {
    cls = 'sla-ok'
    label = compact ? format(deadlineDate, 'MMM d') : `Due ${format(deadlineDate, 'MMM d, yyyy HH:mm')}`
  }

  return (
    <span className={`text-xs font-mono font-semibold ${cls}`} title={`SLA Deadline: ${format(deadlineDate, 'PPpp')}`}>
      {label}
    </span>
  )
}
