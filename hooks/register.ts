import type { EngineInterface, Register } from 'claude-code'

// Writes one line per session to <claude dir>/skill-badge/<session id>, read by
// statusline.sh: "<parent>|<skill>|<phase>|<rounds>|<questions>".
const TEST = /\b(test|tests|vitest|jest|pytest|mocha|rspec|go test|cargo test|bun test)\b/
const QUESTION = /❓ \*\*Q\d+/g

type Phase = 'start' | 'red' | 'green' | 'refactor'
type Badge = { parent?: string; skill?: string; phase: Phase; rounds: number; questions: number }

const isGrill = (b: Badge) => [b.skill, b.parent].some(s => s?.startsWith('grill'))

async function badgeFile($: EngineInterface) {
  const dir = (await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${await $.env.get('HOME')}/.claude`
  return `${dir}/skill-badge/${await $.session.id()}`
}

async function save($: EngineInterface, b: Badge) {
  const line = b.skill ? `${b.parent ?? ''}|${b.skill}|${b.phase}|${b.rounds}|${b.questions}\n` : ''
  await $.fs.write(await badgeFile($), line)
}

export const register: Register = on => {
  const b: Badge = { phase: 'start', rounds: 0, questions: 0 }
  // A skill loaded later in the same turn was called by the one before it.
  let isFirstInTurn = true

  on('skill.prompt', async ($, e, next) => {
    const skill = e.skill.split(':').pop()
    b.parent = isFirstInTurn || !b.skill ? undefined : (b.parent ?? b.skill)
    b.skill = skill
    b.phase = 'start'
    if (isFirstInTurn) {
      b.rounds = 0
      b.questions = 0
    }
    isFirstInTurn = false
    await save($, b)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    // Only the main loop's own test runs move the phase, not a subagent's.
    if (b.skill !== 'tdd' || e.agentId !== undefined || ran.deny !== undefined) return ran

    const before = b.phase
    if (e.tool === 'Bash' && TEST.test(e.command)) {
      if (ran.isError) b.phase = 'red'
      else if (b.phase !== 'refactor') b.phase = 'green'
    } else if ((e.tool === 'Edit' || e.tool === 'Write') && b.phase === 'green') {
      b.phase = 'refactor'
    }
    if (b.phase !== before) await save($, b)
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    isFirstInTurn = true
    const asked = e.answer.match(QUESTION)?.length ?? 0
    if (isGrill(b) && asked > 0) {
      b.rounds += 1
      b.questions += asked
      await save($, b)
    }
    return next(e)
  })
}
