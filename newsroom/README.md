# Climate Finance Newsroom

A small multi-agent pipeline that drafts a Substack-style article per run, aimed at asset owners and asset managers doing net-zero investing, responsible investment, and ESG finance.

## The newsroom

| Stage | Role |
|---|---|
| Scout | Searches the web for story leads on the beat (net-zero investing, responsible investment/ESG, asset owner & manager decisions) and shortlists 3–5 with sources. |
| Writer | Picks the strongest lead and drafts a full article for an asset owner/manager audience. |
| Fact-checker | Verifies every factual and statistical claim against primary sources, applying [Carbon Brief](https://www.carbonbrief.org/)-level rigor to any climate-science or carbon-accounting claim (net-zero pathways, carbon removal volumes, emissions figures). |
| Sub-editor | Applies the fact-checker's required fixes and reworks the piece strategically — right angle, right structure, for the target reader. |
| Final editor | Quality gate. Approves for publication, or sends the piece back with numbered revision notes. |

Each role's instructions live in `prompts/*.md` and can be edited directly to retune voice, beat, or standards.

## Setup

```sh
cd newsroom
npm install
```

Requires Claude API credentials — either `ANTHROPIC_API_KEY` in the environment, or an active `ant auth login` profile. See the Anthropic docs if you need to set one up.

## Run

```sh
npm run run                                   # scout picks today's leads itself
npm run run -- "EU SFDR Article 8 fund flows" # or steer the scout with a topic
```

Each run writes the full stage-by-stage output (scout leads, draft, fact-check report, sub-edited draft, final verdict) to `output/<timestamp>/`. If the final editor sends the piece back, `05-final.md` contains numbered revision notes instead of a publishable article — rerunning after editing the draft manually, or re-running the whole pipeline, are both reasonable next steps.

## Notes

- Model: `claude-opus-5`, adaptive thinking (the default).
- Scout and fact-checker use the web search / web fetch tools; writer, sub-editor, and final editor work from the text handed to them.
- `output/` is gitignored — treat it as scratch, not a publishing queue. Move anything worth keeping into your actual Substack draft.
