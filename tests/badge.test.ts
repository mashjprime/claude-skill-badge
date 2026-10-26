import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// Stands in for the engine: answers the calls the plugin makes and records
// what it writes, so a test reads the badge line the status line would.
function engine(on: On, tests: { failing: boolean }) {
  const writes: string[] = []
  on('env.get', (_, e) => ({ value: e.name === 'HOME' ? '/home/t' : undefined }))
  on('session.id', () => ({ value: 's1' }))
  on('fs.write', (_, e) => {
    expect(e.path).toBe('/home/t/.claude/skill-badge/s1')
    writes.push(e.text)
    return { value: undefined }
  })
  on('skill.prompt', (_, e) => ({ text: e.text }))
  on('tool.call', () => (tests.failing ? { result: {}, isError: true } : { result: {} }))
  return () => writes.at(-1)
}

test('tdd moves red, green, refactor; implement shows as its parent', async ($, on) => {
  const tests = { failing: true }
  const badge = engine(on, tests)
  on('turn.complete', () => ({ text: 'done' }))

  await $.skill.prompt({ skill: 'mattpocock-skills:implement', text: '', frontmatter: {} })
  expect(badge()).toBe('|implement|start|0|0\n')

  await $.skill.prompt({ skill: 'tdd', text: '', frontmatter: {} })
  expect(badge()).toBe('implement|tdd|start|0|0\n')

  await $.tool.call({ tool: 'Bash', command: 'uv run pytest -q' })
  expect(badge()).toBe('implement|tdd|red|0|0\n')

  tests.failing = false
  await $.tool.call({ tool: 'Bash', command: 'uv run pytest -q', agentId: 'a1' })
  expect(badge()).toBe('implement|tdd|red|0|0\n')

  await $.tool.call({ tool: 'Bash', command: 'uv run pytest -q' })
  expect(badge()).toBe('implement|tdd|green|0|0\n')

  await $.tool.call({ tool: 'Edit', file_path: '/x.py', old_string: 'a', new_string: 'b' })
  expect(badge()).toBe('implement|tdd|refactor|0|0\n')

  // A passing run keeps refactor; a command that is no test changes nothing.
  await $.tool.call({ tool: 'Bash', command: 'uv run pytest -q' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(badge()).toBe('implement|tdd|refactor|0|0\n')
})

test('grilling counts rounds and questions; a new turn starts a new chain', async ($, on) => {
  const badge = engine(on, { failing: false })
  on('turn.complete', (_, e) => ({ text: e.answer }))
  const turn = (answer: string, agentId?: string) =>
    $.turn.complete({ reason: 'answer', answer, durationMs: 1, isAborted: false, turnId: 't', agentId })

  await $.skill.prompt({ skill: 'mattpocock-skills:grill-me', text: '', frontmatter: {} })
  await $.skill.prompt({ skill: 'mattpocock-skills:grilling', text: '', frontmatter: {} })
  await turn('❓ **Q1** - a\n\n❓ **Q2** - b')
  expect(badge()).toBe('grill-me|grilling|start|1|2\n')

  await turn('❓ **Q3** - c')
  expect(badge()).toBe('grill-me|grilling|start|2|3\n')

  // A reply with no questions is not a round, nor is a subagent's report.
  await turn('Here is the summary.')
  await turn('❓ **Q9** - quoted', 'agent-1')
  expect(badge()).toBe('grill-me|grilling|start|2|3\n')

  await $.skill.prompt({ skill: 'tdd', text: '', frontmatter: {} })
  expect(badge()).toBe('|tdd|start|0|0\n')
})
