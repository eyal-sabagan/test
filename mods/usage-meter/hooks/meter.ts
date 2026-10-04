import type { Limit } from '../types'

export const THRESHOLDS = [80, 95]

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d' }

export const label = (kind: string) => LABELS[kind] ?? kind

export const bar = (percent: number, width = 10) => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)

  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export const tone = (percent: number) =>
  percent >= 95 ? 'error' : percent >= 80 ? 'warning' : 'success'

export const resetsIn = (resetsAt: string | undefined, now: number) => {
  if (!resetsAt) return ''
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60000))
  if (Number.isNaN(minutes)) return ''
  if (minutes < 1) return 'resets now'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `resets in ${days}d ${hours}h`
  if (hours > 0) return `resets in ${hours}h ${mins}m`

  return `resets in ${mins}m`
}

export const line = (limit: Limit, now: number) => {
  const reset = resetsIn(limit.resetsAt, now)

  return `${label(limit.kind)} ${bar(limit.percentUsed)} ${limit.percentUsed}%${reset ? ` · ${reset}` : ''}`
}

/** Highest threshold already alerted per window, keyed `kind@resetsAt` so a new window alerts again. */
export type Alerted = Record<string, number>

export const crossed = (limits: Limit[], alerted: Alerted) => {
  const next: Alerted = {}
  const alerts: { limit: Limit; threshold: number }[] = []
  for (const limit of limits) {
    const key = `${limit.kind}@${limit.resetsAt ?? ''}`
    const done = alerted[key] ?? 0
    const top = THRESHOLDS.filter(t => limit.percentUsed >= t).pop() ?? 0
    next[key] = Math.max(done, top)
    if (top > done) alerts.push({ limit, threshold: top })
  }

  return { alerts, next }
}
