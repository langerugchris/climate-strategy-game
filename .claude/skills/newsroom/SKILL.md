---
name: newsroom
description: >
  Runs the climate finance newsroom's five-stage editorial pipeline (scout,
  writer, fact-checker, sub-editor, final editor) as a chain of subagents,
  producing a net-zero investing / responsible investment / ESG article for
  asset owners and asset managers. Runs entirely inside this Claude Code
  session on the user's existing subscription — no Anthropic API key needed.
  Trigger this whenever the user types /newsroom, asks to draft, run, or
  produce a newsroom/newsletter article, or references the climate finance
  newsroom pipeline — including casual phrasing like "run the newsroom on
  X" or "draft something on the EU's SFDR review for the newsletter."
---

# Newsroom pipeline

This skill runs the five editorial roles defined in `newsroom/prompts/` as a
chain of subagents, each depending on the previous stage's output. It's the
in-session equivalent of the standalone `newsroom/pipeline.mjs` API script —
same roles, same prompt files, but running on Claude Code access instead of
a metered API key.

**Read each prompt file fresh at invocation time** (`newsroom/prompts/scout.md`,
`writer.md`, `fact-checker.md`, `sub-editor.md`, `final-editor.md`) rather
than relying on memory — that file is the single source of truth for that
role's behavior, and it may have been edited since you last saw it. Both
this skill and the script read from the same files on purpose, so tuning a
role's voice or standards in one place updates both invocation paths.

## Argument

The skill's argument, if given, is a topic hint for the scout (e.g.
`/newsroom EU SFDR Article 8 fund flows`). If no argument is given, tell the
scout to find today's best leads on its own beat.

## Steps

Run these one at a time, in the foreground — each stage needs the previous
stage's output as input, so they can't run in parallel. Use the `Agent` tool
with `subagent_type: general-purpose` for each (it has web search, which the
scout and fact-checker need; the others just need to think and write).

1. **Scout** — spawn a subagent with the contents of `newsroom/prompts/scout.md`
   as its instructions, plus the topic hint (or "find today's best leads" if
   none was given). Ask it to search the web and return 3–5 shortlisted leads.
2. **Writer** — spawn a subagent with `newsroom/prompts/writer.md` as
   instructions, plus the scout's leads. Ask it to pick the strongest lead and
   write the full draft article.
3. **Fact-checker** — spawn a subagent with `newsroom/prompts/fact-checker.md`
   as instructions, plus the draft. Ask it to verify every claim against
   primary sources and return a structured fact-check report.
4. **Sub-editor** — spawn a subagent with `newsroom/prompts/sub-editor.md` as
   instructions, plus the draft and the fact-check report. Ask it to produce
   a revised article that incorporates every required fix.
5. **Final editor** — spawn a subagent with `newsroom/prompts/final-editor.md`
   as instructions, plus the sub-edited article. It will either approve
   (final Markdown + editorial note) or request revision (numbered notes, no
   article).

## Presenting the result

Show the user the actual outcome in the conversation — the full approved
article, or the final editor's revision notes — don't just report that the
pipeline finished. This is the deliverable; a status message isn't enough.

If the final editor approved the piece, also save it to
`newsroom/output/<ISO-timestamp-slug>/final.md` (mirroring where the API
script saves its output), so a finished article isn't only living in chat
history. If revision was requested, there's nothing worth saving — just show
the notes and let the user decide whether to try again with adjustments.
