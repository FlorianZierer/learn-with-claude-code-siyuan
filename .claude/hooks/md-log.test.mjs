import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { renderLog } from "./render-log.mjs";

const labels = { user: "Du", question: "Frage", answer: "Meine Antwort" };
const line = (type, content, extra = {}) => JSON.stringify({ type, message: { content }, ...extra });
const ask = line("assistant", [{ type: "tool_use", name: "AskUserQuestion", id: "quiz", input: {
  questions: [{ question: "Wie viel?", header: "Zahl", options: [{ label: "Zwei" }] }],
} }]);

test("internal messages, commands, thinking and ordinary tools stay out of the log", () => {
  const result = renderLog([
    line("user", "Another Claude session sent a message: secret", { isMeta: true }),
    line("user", "<agent-message>secret</agent-message>"),
    line("user", "<command-message>teach</command-message>"),
    line("user", "<task-notification>secret</task-notification>"),
    line("assistant", [{ type: "thinking", thinking: "secret" }, { type: "text", text: "Die Erklärung." }]),
    line("user", [{ type: "tool_result", tool_use_id: "read", content: "secret" }]),
    line("user", [{ type: "text", text: "Meine Frage." }]),
    "invalid json",
  ], 0, labels);
  assert.doesNotMatch(result, /secret|command-message|task-notification/);
  assert.match(result, /Die Erklärung/);
  assert.match(result, /### Du\n\nMeine Frage/);
});

test("structured quiz answers survive across Stop boundaries without English wrappers", () => {
  const result = renderLog([ask, line("user", [{ type: "tool_result", tool_use_id: "quiz", content: "English wrapper" }], {
    toolUseResult: { answers: { "Wie viel?": "Zwei" } },
  })], 1, labels);
  assert.match(result, /Meine Antwort/);
  assert.match(result, /Zahl:\*\* Zwei/);
  assert.doesNotMatch(result, /English|Wie viel\?/);
});

test("legacy quiz answer strings are parsed; unknown tool output is never copied", () => {
  const result = renderLog([ask, line("user", [{ type: "tool_result", tool_use_id: "quiz",
    content: 'Your questions have been answered: "Wie viel?"="Zwei". You can now continue.',
  }])], 0, labels);
  assert.match(result, /Zahl:\*\* Zwei/);
  assert.doesNotMatch(result, /Your questions|You can/);
});

test("SiYuan sync uses notes only, backs up, retries without new chat and isolates topics", async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learn-note-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const hooks = path.join(dir, ".claude/hooks");
  fs.mkdirSync(hooks, { recursive: true });
  for (const name of ["md-log.mjs", "render-log.mjs"]) fs.copyFileSync(new URL(name, import.meta.url), path.join(hooks, name));
  const topicDir = path.join(dir, "topics/one");
  fs.mkdirSync(topicDir, { recursive: true });
  fs.writeFileSync(path.join(topicDir, "log.md"), "DO NOT PUBLISH TRANSCRIPT");
  const config = path.join(dir, ".claude/learn.json");
  fs.writeFileSync(config, JSON.stringify({ topic: "one", siyuan: { notebook: "Learning", docs: { one: "doc-one" }, pending: "OLD RAW LOG" } }));
  const calls = [];
  let fail = true;
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    calls.push({ url: req.url, body: JSON.parse(body) });
    let data = null;
    if (req.url.endsWith("getBlockKramdown")) data = { kramdown: "old remote content" };
    if (req.url.endsWith("lsNotebooks")) data = { notebooks: [{ name: "Learning", id: "nb" }] };
    if (req.url.endsWith("createDocWithMd")) data = "doc-two";
    const error = fail && req.url.endsWith("updateBlock");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ code: error ? -1 : 0, msg: error ? "retry me" : "", data }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(hooks, "md-log.mjs")], {
      env: { ...process.env, SIYUAN_URL: `http://127.0.0.1:${server.address().port}`, SIYUAN_TOKEN: "test-token" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(stderr)));
    child.stdin.end("{}");
  });
  await run();
  assert.equal(calls.length, 0, "missing notes never fall back to the log");
  fs.writeFileSync(path.join(topicDir, "notes.md"), "# Deutsche Erklärung\n\nSteigung bedeutet Änderung pro Einheit.");
  await run();
  let cfg = JSON.parse(fs.readFileSync(config));
  assert.match(cfg.siyuan.lastError, /retry me/);
  assert.equal(cfg.siyuan.noteHashes.one, undefined);
  assert.equal(fs.readFileSync(path.join(topicDir, "backups/siyuan-doc-one.md"), "utf8"), "old remote content");
  fail = false;
  await run();
  cfg = JSON.parse(fs.readFileSync(config));
  assert.ok(cfg.siyuan.noteHashes.one);
  assert.equal(cfg.siyuan.lastError, undefined);
  assert.equal(cfg.siyuan.pending, undefined);
  const count = calls.length;
  await run();
  assert.equal(calls.length, count, "unchanged notes do not cause duplicate updates");
  fs.appendFileSync(path.join(topicDir, "notes.md"), "\nEine Ergänzung.");
  await run();
  assert.equal(calls.length, count + 1);
  assert.match(calls.at(-1).body.data, /Eine Ergänzung/);
  cfg = JSON.parse(fs.readFileSync(config));
  cfg.topic = "two";
  fs.writeFileSync(config, JSON.stringify(cfg));
  fs.mkdirSync(path.join(dir, "topics/two"));
  fs.writeFileSync(path.join(dir, "topics/two/notes.md"), "# Zweites Thema");
  await run();
  assert.equal(calls.at(-1).url, "/api/filetree/createDocWithMd");
  assert.equal(calls.at(-1).body.markdown, "# Zweites Thema");
  assert.doesNotMatch(JSON.stringify(calls), /DO NOT PUBLISH|OLD RAW LOG/);
});
