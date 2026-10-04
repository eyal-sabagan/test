import { expect, test } from 'claude-code/testing'

import { bar, crossed, line, resetsIn, tone } from '../hooks/meter'

const NOW = Date.parse('2026-10-04T12:00:00Z')

test('formats a window line', async () => {
  expect(bar(52)).toBe('█████░░░░░')
  expect(resetsIn('2026-10-04T13:40:00Z', NOW)).toBe('resets in 1h 40m')
  expect(resetsIn('2026-10-06T16:00:00Z', NOW)).toBe('resets in 2d 4h')
  expect(line({ kind: 'five_hour', percentUsed: 52, resetsAt: '2026-10-04T12:42:00Z' }, NOW)).toBe(
    '5h █████░░░░░ 52% · resets in 42m',
  )
  expect([tone(10), tone(80), tone(97)]).toEqual(['success', 'warning', 'error'])
})

test('alerts once per threshold per window', async () => {
  const w = { kind: 'five_hour', resetsAt: 'A' }
  const first = crossed([{ ...w, percentUsed: 83 }], {})
  expect(first.alerts.map(a => a.threshold)).toEqual([80])
  expect(crossed([{ ...w, percentUsed: 88 }], first.next).alerts).toEqual([])
  const third = crossed([{ ...w, percentUsed: 96 }], first.next)
  expect(third.alerts.map(a => a.threshold)).toEqual([95])
  expect(crossed([{ ...w, resetsAt: 'B', percentUsed: 81 }], third.next).alerts.length).toBe(1)
})
