#!/usr/bin/env node
/**
 * Keep a filtered local conversation log, then sync the teacher-authored notes.md to SiYuan.
 * Run as a Stop hook, or with empty stdin to retry note synchronization without a transcript.
 */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { renderLog } from "./render-log.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLAUDE_DIR = path.join(HERE, "..");
const PROJECT_DIR = path.join(CLAUDE_DIR, "..");
const CONFIG = path.join(CLAUDE_DIR, "learn.json");

const DEFAULT_LABELS = { user: "You", question: "Question", answer: "My answer" };

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

let input = {};
try {
  input = JSON.parse(readStdin() || "{}");
} catch {
  process.exit(0);
}

let cfg = null;
try {
  cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
} catch {
  process.exit(0); // not configured — nothing to do
}
if (!cfg || !cfg.topic) process.exit(0); // no active topic

const root = cfg.topicsRoot || "topics";
const topicDir = path.isAbsolute(root)
  ? path.join(root, cfg.topic)
  : path.join(PROJECT_DIR, root, cfg.topic);
const target = path.join(topicDir, "log.md");
const notes = path.join(topicDir, "notes.md");
const labels = { ...DEFAULT_LABELS, ...(cfg.labels || {}) };

const transcript = input.transcript_path;
const sessionId = input.session_id || "unknown";
let lines = [];
try {
  if (transcript) lines = fs.readFileSync(transcript, "utf8").split(/\r?\n/).filter(l => l.trim());
} catch {} // Note synchronization must still run if no transcript is available.
cfg.sessions = cfg.sessions || {};
const start = cfg.sessions[sessionId] || 0;
const out = renderLog(lines, start, labels);

if (out.length) {
  fs.mkdirSync(topicDir, { recursive: true });
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, `# ${cfg.topic}\n\n*${new Date().toISOString().slice(0, 10)}*\n`, "utf8");
  }
  fs.appendFileSync(target, out, "utf8");
}

// SiYuan is a generated reading view of notes.md, never a transcript mirror.
// Full replacement makes edits and retries idempotent; hashes are scoped to each topic.
// Server address and secrets come from .env (git-ignored), never from learn.json, which this hook rewrites every turn.
// Variables already set in the environment win. process.loadEnvFile needs Node >= 20.12.
try {
  process.loadEnvFile(path.join(PROJECT_DIR, ".env"));
} catch {}
const env = process.env;

const sy = cfg.siyuan;
if (sy && sy.notebook && env.SIYUAN_URL && env.SIYUAN_TOKEN && fs.existsSync(notes)) {
  sy.docs = sy.docs || {};
  sy.assets = sy.assets || {};
  const docId = sy.docs[cfg.topic];
  sy.noteHashes = sy.noteHashes || {};
  const md = fs.readFileSync(notes, "utf8").trim();
  const hash = createHash("sha256").update(md).digest("hex");
  const deadline = AbortSignal.timeout(15000); // the hook itself is killed at 20s

  async function api(endpoint, body) {
    const headers = { Authorization: `Token ${env.SIYUAN_TOKEN}` };
    if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
      headers["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
      headers["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
    }
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    const res = await fetch(new URL(endpoint, env.SIYUAN_URL), { method: "POST", headers, body, signal: deadline });
    let j;
    try {
      j = JSON.parse(await res.text());
    } catch {
      // Cloudflare Access answers with a login page, not JSON
      throw new Error(`${endpoint}: HTTP ${res.status}, no JSON (blocked by Cloudflare Access?)`);
    }
    if (!res.ok || j.code !== 0) throw new Error(`${endpoint}: ${j.msg}`);
    return j.data;
  }

  // Obsidian embeds (![[viz-x.png|500]]) mean nothing to SiYuan: upload the file once, link the asset.
  async function withAssets(md) {
    const re = /!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
    for (const [, name] of md.matchAll(re)) {
      if (sy.assets[name]) continue;
      const file = [path.join(topicDir, "viz", name), path.join(topicDir, name)].find((p) => fs.existsSync(p));
      if (!file) continue;
      const form = new FormData();
      form.append("assetsDirPath", "/assets/");
      form.append("file[]", new Blob([fs.readFileSync(file)]), name);
      const data = await api("/api/asset/upload", form);
      if (data.succMap?.[name]) sy.assets[name] = data.succMap[name];
    }
    return md.replace(re, (m, name) => (sy.assets[name] ? `![${name}](${sy.assets[name]})` : m));
  }

  try {
    if (md && (!docId || sy.noteHashes[cfg.topic] !== hash)) {
      const data = await withAssets(md);
      if (!docId) {
        const { notebooks } = await api("/api/notebook/lsNotebooks", {});
        const nb = notebooks.find(n => n.name === sy.notebook);
        if (!nb) throw new Error(`notebook "${sy.notebook}" not found`);
        sy.docs[cfg.topic] = await api("/api/filetree/createDocWithMd", {
          notebook: nb.id, path: `/${cfg.topic}`, markdown: data,
        });
      } else {
        // Preserve the existing SiYuan content before the first migration from log to notes.
        if (!sy.noteHashes[cfg.topic]) {
          const old = await api("/api/block/getBlockKramdown", { id: docId });
          if (typeof old?.kramdown !== "string") throw new Error("Could not back up existing SiYuan document");
          const backupDir = path.join(topicDir, "backups");
          fs.mkdirSync(backupDir, { recursive: true });
          const backup = path.join(backupDir, `siyuan-${docId}.md`);
          if (!fs.existsSync(backup)) fs.writeFileSync(backup, old.kramdown, "utf8");
        }
        await api("/api/block/updateBlock", { dataType: "markdown", data, id: docId });
      }
      sy.noteHashes[cfg.topic] = hash;
      // Legacy pending transcript text must never enter the reading note.
      delete sy.pending;
      delete sy.lastError;
    }
  } catch (err) {
    // Keep the previous hash: the next Stop retries the latest complete note, even without new chat.
    sy.lastError = `${new Date().toISOString()} ${err.message}`;
  }
}

if (transcript && lines.length > start) cfg.sessions[sessionId] = lines.length;
fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + "\n", "utf8");
process.exit(0);
