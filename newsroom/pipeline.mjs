import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic();
const MODEL = "claude-opus-5";

const WEB_SEARCH_TOOL = { type: "web_search_20260209", name: "web_search" };
const WEB_FETCH_TOOL = { type: "web_fetch_20260209", name: "web_fetch" };

function loadPrompt(name) {
  return readFileSync(path.join(__dirname, "prompts", `${name}.md`), "utf8");
}

function textOf(response) {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

// Server-side tools (web_search / web_fetch) run their own sampling loop and
// can stop early with pause_turn after many iterations; resend to resume.
async function runAgent({ system, user, tools = [], maxTokens = 8000 }) {
  let messages = [{ role: "user", content: user }];
  let response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    tools,
    messages,
  });

  while (response.stop_reason === "pause_turn") {
    messages = [
      { role: "user", content: user },
      { role: "assistant", content: response.content },
    ];
    response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools,
      messages,
    });
  }

  return { text: textOf(response), response };
}

async function main() {
  const topicHint = process.argv.slice(2).join(" ").trim();

  console.log("Scout: hunting for story leads...");
  const scout = await runAgent({
    system: loadPrompt("scout"),
    user: topicHint
      ? `Find and shortlist story leads related to: ${topicHint}`
      : "Find and shortlist today's best story leads for this newsroom's beat.",
    tools: [WEB_SEARCH_TOOL],
    maxTokens: 6000,
  });

  console.log("Writer: drafting...");
  const writer = await runAgent({
    system: loadPrompt("writer"),
    user: `Here are the scout's story leads. Pick the single strongest lead for our audience and write the full article.\n\n${scout.text}`,
    maxTokens: 8000,
  });

  console.log("Fact-checker: verifying claims...");
  const factCheck = await runAgent({
    system: loadPrompt("fact-checker"),
    user: `Fact-check the following draft article. Verify every factual and statistical claim against primary sources.\n\n${writer.text}`,
    tools: [WEB_SEARCH_TOOL, WEB_FETCH_TOOL],
    maxTokens: 6000,
  });

  console.log("Sub-editor: reviewing strategically...");
  const subEdit = await runAgent({
    system: loadPrompt("sub-editor"),
    user:
      `Here is the draft article and the fact-checker's report. Revise the article: incorporate every ` +
      `required correction, sharpen the strategic angle for our audience, and tighten structure.\n\n` +
      `=== DRAFT ===\n${writer.text}\n\n=== FACT-CHECK REPORT ===\n${factCheck.text}`,
    maxTokens: 8000,
  });

  console.log("Final editor: quality gate...");
  const finalEdit = await runAgent({
    system: loadPrompt("final-editor"),
    user:
      `Here is the sub-edited article, ready for final review. Approve it for publication or send it ` +
      `back with specific, numbered revision requests.\n\n${subEdit.text}`,
    maxTokens: 8000,
  });

  const slug = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(__dirname, "output", slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "01-scout.md"), scout.text);
  writeFileSync(path.join(outDir, "02-draft.md"), writer.text);
  writeFileSync(path.join(outDir, "03-fact-check.md"), factCheck.text);
  writeFileSync(path.join(outDir, "04-sub-edit.md"), subEdit.text);
  writeFileSync(path.join(outDir, "05-final.md"), finalEdit.text);

  const approved = finalEdit.text.includes("REVISION REQUESTED") === false;
  console.log(
    `\n${approved ? "Approved." : "Sent back for revision."} Stage-by-stage output written to ${outDir}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
