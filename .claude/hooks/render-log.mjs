// Only the human conversation belongs in the local session history.
const INTERNAL = /^(?:<command-(?:name|message)>|<local-command-stdout>|<user-prompt-submit-hook>|<task-notification>|<agent-message\b|<teammate-message\b|Another Claude session sent a message:|Caveat:)/;
const clean = (text) => String(text || "").replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "").trim();

export function renderLog(lines, start = 0, labels = {}) {
  labels = { user: "You", question: "Question", answer: "My answer", ...labels };
  const out = [];
  const asks = new Map();
  // Replay older tool calls too: answers can arrive after a previous Stop hook.
  for (let i = 0; i < lines.length; i++) {
    let e;
    try { e = JSON.parse(lines[i]); } catch { continue; }
    if (!e.message || e.isMeta || e.isSidechain) continue;
    const content = e.message.content;
    const blocks = typeof content === "string" ? [{ type: "text", text: content }] : content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (e.type === "assistant" && b.type === "tool_use" && b.name === "AskUserQuestion") {
        const qs = b.input?.questions || [];
        asks.set(b.id, qs);
        if (i < start) continue;
        for (const q of qs) {
          out.push(`\n#### ${q.header || labels.question}\n\n${q.question}\n\n` +
            (q.options || []).map((o, n) => `${n + 1}. ${o.label}${o.description ? ` — ${o.description}` : ""}`).join("\n") + "\n");
        }
      } else if (e.type === "user" && b.type === "tool_result" && asks.has(b.tool_use_id)) {
        const qs = asks.get(b.tool_use_id);
        asks.delete(b.tool_use_id);
        if (i < start) continue;
        // Prefer the structured answer map; never copy the tool's English wrapper.
        let answers = e.toolUseResult?.answers;
        if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
          const body = typeof b.content === "string" ? b.content :
            (Array.isArray(b.content) ? b.content.filter(x => x.type === "text").map(x => x.text).join("\n") : "");
          answers = {};
          for (const match of body.matchAll(/"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"/g)) {
            try { answers[JSON.parse(`"${match[1]}"`)] = JSON.parse(`"${match[2]}"`); } catch {}
          }
        }
        const rows = qs.filter(q => Object.hasOwn(answers, q.question)).map(q => {
          const value = answers[q.question];
          return `- **${q.header || q.question}:** ${Array.isArray(value) ? value.join(", ") : String(value)}`;
        });
        if (rows.length) out.push(`\n**${labels.answer}:**\n\n${rows.join("\n")}\n`);
      } else if (i >= start && b.type === "text" && ["user", "assistant"].includes(e.type)) {
        const text = clean(b.text);
        if (!text || INTERNAL.test(text)) continue;
        out.push(e.type === "user" ? `\n---\n\n### ${labels.user}\n\n${text}\n` : `\n${text}\n`);
      }
    }
  }
  return out.join("\n");
}
