import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit } from '../types'
import { crossed, line, tone } from './meter'
import type { Alerted } from './meter'

const PANE = 'usage-meter'
const ALERTED = 'alerted'
const limits = atom({ plugin: 'usage-meter', key: 'limits' } as const, [])
const now = atom({ plugin: 'usage-meter', key: 'now' } as const, 0)

const toLimits = (raw: readonly Limit[]): Limit[] =>
  raw.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt }))

const summary = (list: Limit[], at: number) =>
  list.length === 0
    ? 'No usage reading yet: it arrives with the first reply on a Pro/Max subscription.'
    : list.map(limit => line(limit, at)).join('\n')

const push = async ($: EngineInterface, message: string) => {
  $.ui.toast(message, { timeoutMs: 8000 })
  try {
    const tools = await $.tool.list()
    if (tools.some(t => t.name === 'PushNotification')) {
      await $.tool.call({ tool: 'PushNotification', message, status: 'proactive' })
    }
  } catch {
    // No push channel here (or it was refused): the toast already showed.
  }
}

const take = async ($: EngineInterface, raw: readonly Limit[]) => {
  const list = toLimits(raw)
  await update($, limits, () => list)
  await update($, now, () => Date.now())

  const alerted = ((await $.store.get(ALERTED)) ?? {}) as Alerted
  const { alerts, next } = crossed(list, alerted)
  await $.store.set(ALERTED, next)
  for (const { limit, threshold } of alerts) {
    await push($, `Claude usage ${threshold}%+: ${line(limit, Date.now())}`)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'usage-meter',
      description: 'Show the 5-hour and weekly usage left',
    })
    $.clock.every(60_000, () => void update($, now, () => Date.now()))
    const ran = await next(e)
    await take($, (await $.session.usage()).rateLimits)

    return ran
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await take($, e.rateLimits)

    return next(e)
  })

  on('command.run', { command: 'usage-meter' }, async $ => {
    await take($, (await $.session.usage()).rateLimits)
    await $.ui.open({ id: PANE, title: 'Usage' })

    return { text: summary(await read($, limits), Date.now()) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, limits)
    if (e.props.hasSurvey) return next(e)
    const at = (await read($, now)) || Date.now()
    const { Box, Text } = $.ui.resolve(e)
    if (list.length === 0) return <Text dimColor>usage-meter: no usage reading in this session yet</Text>

    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={3}>
        {list.map(limit => (
          <Text key={limit.kind} color={tone(limit.percentUsed)}>
            {line(limit, at)}
          </Text>
        ))}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, limits)
    const at = (await read($, now)) || Date.now()
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>{summary(list, at)}</Text>}
        {list.map(limit => (
          <Text key={limit.kind} color={tone(limit.percentUsed)}>
            {line(limit, at)}
          </Text>
        ))}
      </Box>
    )
  })
}
