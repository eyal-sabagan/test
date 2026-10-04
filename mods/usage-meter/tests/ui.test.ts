import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const LIMITS = [
  { kind: 'five_hour', percentUsed: 62, resetsAt: '2099-01-01T00:00:00Z' },
  { kind: 'seven_day', percentUsed: 18, resetsAt: '2099-01-03T00:00:00Z' },
]

const world = (on: On) => {
  const toasts: string[] = []
  mock.store(on)
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('tool.list', () => [] as never)
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return {} as never
  })

  return toasts
}

const measure = (rateLimits: typeof LIMITS) => ({
  context: { window: 200000 },
  rateLimits,
  changed: ['rateLimits' as const],
})

test('band shows both windows on terminal and desktop, pane on mobile', async ($, on) => {
  world(on)
  await $.session.measure(measure(LIMITS))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'usage-meter',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10 } as never,
    })
    expect(await ui.find({ type: 'Text', text: /^5h .* 62% · resets in/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^7d .* 18% · resets in/ })).toBeDefined()
    await ui.unmount()
  }

  const pane = await $.ui.mount({
    plugin: 'usage-meter',
    surface: 'mobile',
    component: 'Pane',
    requestId: 'usage-meter',
    props: {} as never,
  })
  expect((await pane.find({ type: 'Text', text: /^5h / }))?.props.color).toBe('success')
  await pane.unmount()
})

test('alerts once when a window crosses 80%, again at 95%', async ($, on) => {
  const toasts = world(on)
  const at = (p: number) => measure([{ ...LIMITS[0]!, percentUsed: p }])
  await $.session.measure(at(83))
  await $.session.measure(at(88))
  await $.session.measure(at(96))
  expect(toasts.length).toBe(2)
  expect(toasts[0]).toMatch(/80%\+/)
  expect(toasts[1]).toMatch(/95%\+/)
})
