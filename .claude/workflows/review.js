export const meta = {
  name: 'zauberkoch-review',
  description: 'Review changed files across correctness/security/conventions dimensions, adversarially verify each finding',
  whenToUse: 'Before a deploy or PR: thorough multi-agent review of the current diff',
  phases: [
    { title: 'Review', detail: 'one reviewer per dimension' },
    { title: 'Verify', detail: 'adversarial check per finding' },
  ],
}

const FINDINGS = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'summary', 'severity'],
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          summary: { type: 'string' },
          severity: { enum: ['low', 'medium', 'high'] },
        },
      },
    },
  },
}

const VERDICT = {
  type: 'object',
  required: ['isReal', 'reason'],
  properties: { isReal: { type: 'boolean' }, reason: { type: 'string' } },
}

const DIMENSIONS = [
  { key: 'correctness', prompt: 'Review the uncommitted diff (git diff HEAD) in this repo for correctness bugs: logic errors, unhandled edge cases (SSE aborts, cache races, day-boundary rate limits), broken Alembic migration paths. Report only defects with a concrete failure scenario.' },
  { key: 'security', prompt: 'Review the uncommitted diff (git diff HEAD) for security issues: ANTHROPIC_API_KEY or secrets leaking client-side, missing server-side validation or rate limiting, session/CSRF flaws, tokens in localStorage, unescaped AI/user content in the DOM.' },
  { key: 'conventions', prompt: 'Review the uncommitted diff (git diff HEAD) against the project rules in .claude/rules/: linear CSS transitions instead of springs, missing prefers-reduced-motion guards, inline hex colors instead of tokens.css, hardcoded UI strings instead of i18n/de.ts, Anthropic calls outside services/ai.py, prompt files edited in place instead of versioned, schema changes without migration, service-worker cache not bumped.' },
]

const results = await pipeline(
  DIMENSIONS,
  (d) => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS }),
  (review, d) =>
    parallel(
      (review?.findings ?? []).map((f) => () =>
        agent(
          `Adversarially verify this ${d.key} finding in the current repo. Try to REFUTE it; default to not real if uncertain.\nFile: ${f.file}${f.line ? ':' + f.line : ''}\nClaim: ${f.summary}`,
          { label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT }
        ).then((v) => ({ ...f, dimension: d.key, verdict: v }))
      )
    )
)

const confirmed = results
  .filter(Boolean)
  .flat()
  .filter(Boolean)
  .filter((f) => f.verdict?.isReal)

log(`${confirmed.length} confirmed finding(s)`)
return { confirmed }
