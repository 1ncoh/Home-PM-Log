export function addInterval(date: Date, interval: number, unit: string) {
  const d = new Date(date)
  switch (unit) {
    case 'day':
      d.setDate(d.getDate() + interval)
      break
    case 'week':
      d.setDate(d.getDate() + interval * 7)
      break
    case 'month':
      d.setMonth(d.getMonth() + interval)
      break
    case 'year':
      d.setFullYear(d.getFullYear() + interval)
      break
    default:
      d.setDate(d.getDate() + interval)
  }
  return d
}

export function computeNextDue(lastDoneAt: Date | null, interval: number, unit: string) {
  const base = lastDoneAt ? new Date(lastDoneAt) : new Date()
  return addInterval(base, interval, unit)
}
