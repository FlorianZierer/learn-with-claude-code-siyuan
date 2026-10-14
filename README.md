# learn-with-claude-code

A one-on-one AI tutor that refuses to let you memorise things.

This is a Claude Code port of [amosblomqvist/learn](https://github.com/amosblomqvist/learn)
by [Eero Alvar](https://github.com/amosblomqvist) ([video](https://youtu.be/kzcI5F4tGiU)), built for
[pi](https://github.com/pi-labs-ai/pi) with custom extensions. The teaching philosophy is his; this
repository rebuilds it on Claude Code's own mechanisms — skills, subagents and hooks — so it runs
anywhere Claude Code runs, with no extra runtime.

## The idea

The goal is never "you can recite the fact." The goal is **understanding**: the fact is derivable
from foundations you already accept, connected to the rest of what you know, and therefore
self-preserving. Memorised facts rot. Understood facts don't.

Two principles do the work:

1. **Unconditional truths first.** Start only from things you accept as-is, with no caveats. Not
   things you are *familiar* with — things you have no objection to right now. Every later claim is
   built from those by explicit steps, so your knowledge is a graph, not a pile.
2. **"How could I have discovered this?"** Every step is motivated before it is stated. Nothing
   arrives out of nowhere.

And one process, run in order, every time:

- **Probe** — graded multiple-choice questions that bracket what you know, binary-searching for the
  ceiling. Not "do you understand?" — self-report is not measurement.
- **Plan** — a dependency graph from your actual foundations to your actual goal, presented for
  your approval before any teaching starts.
- **Teach** — one reasoning step per message, with quizzes that check whether it landed.

## Quick start

```bash
git clone https://github.com/metetik/learn-with-claude-code.git
cd learn-with-claude-code
claude
```

Then tell it what you want to learn:

```
/teach linear algebra
```

On the first run it creates `.claude/learn.json` from the template and asks two questions: what
language to teach you in, and where to keep topic folders (a folder inside your Obsidian vault, or
the default `topics/` inside the project). After that it goes straight into the probe.

Each topic gets its own folder:

```
topics/<topic-slug>/
  notes.md     ← a coherent explanation in your configured language, published to SiYuan
  progress.md  ← current learning phase, demonstrated knowledge and exact next step
  log.md       ← filtered local conversation and quiz history for resuming the session
  sources/     ← drop your own PDFs, notes and links here; they are read before the probe
  viz/         ← generated diagrams
```

`progress.md` is the resume checkpoint, backed by the conversation evidence in `log.md`.
Start a new session on the same topic and the teacher continues the saved phase without repeating
completed baseline questions. A complete reading note does not imply you have mastered its contents.

## Lehrer anpassen und später weitermachen

Bearbeite **[TEACHER.md](TEACHER.md)**, um Sprache, Ton, Erklärstil, Tempo, Fragen und die Gestaltung
der SiYuan-Notizen festzulegen. Normale Sätze reichen. Das Profil wird zu Beginn jeder Lernsession
gelesen; konkrete Wünsche im Gespräch haben Vorrang. Voreingestellt sind Deutsch, kleine
Gedankenschritte und eine ruhige, übersichtliche Notizgestaltung. Globale Schriftgrößen, Farben
und Themes stellst du direkt in SiYuan ein.

Du kannst jederzeit aufhören und später im selben Projekt die Themenauswahl öffnen:

```text
/teach_continue
```

Du erhältst eine Auswahl der bisherigen Lernthemen mit dem letzten Stand bzw. nächsten
Lernschritt. Nach deiner Auswahl geht es an dieser Stelle weiter, ohne die abgeschlossenen
Einstiegsfragen zu wiederholen. Auch ältere Themen ohne `progress.md` werden anhand ihres
`log.md` gefunden. Der Ablauf liegt als [Claude-Code-Skill](https://code.claude.com/docs/en/skills) in
`.claude/skills/teach_continue/SKILL.md`, neben dem bestehenden `teach`-Skill.

Wenn du das Thema bereits weißt, kannst du weiterhin direkt schreiben:

```text
/teach gradient descent
Weiter am gespeicherten Lernstand, ohne neue Einstiegsfragen.
```

Der Lehrer speichert den Fortschritt nach jeder inhaltlichen Runde in
`topics/<thema>/progress.md`: bekannte Grundlagen, offene Fragen, aktuelle Phase und den nächsten
Schritt. Ein neuer Chat oder Tag startet die Einstiegsbefragung nicht erneut. Der Lernstand bleibt
lokal; nur die lesbare Erklärung aus `notes.md` wird nach SiYuan übertragen.

## Lernthemen aus Vorlesungsfolien

Lege deine Folien vorzugsweise als PDF in `materials/` ab. Für mehrere Vorlesungen kannst du
Unterordner verwenden, zum Beispiel `materials/machine-learning/vorlesung-01.pdf`. Die
Unterlagen und die erzeugten Themenkataloge bleiben lokal und werden von Git ignoriert.

Starte danach:

```text
/teach_import
```

Der Lehrer liest die Unterlagen und schlägt überschaubare Lernthemen vor – jeweils mit Lernziel,
passenden Folienseiten, Voraussetzungen und einer empfohlenen Reihenfolge. Du wählst ein Thema,
das ihr anschließend anhand der Folien erarbeitet. Bereits begonnene Themen werden am gespeicherten
Stand fortgesetzt. Du kannst auch einen bestimmten Pfad angeben:

```text
/teach_import materials/machine-learning/vorlesung-01.pdf
```

Der Katalog wird unter `materials/<kurs>/topics.md` gespeichert. Neue Vorschläge kannst du später
erneut über `/teach_import` auswählen; begonnene Themen findest du über `/teach_continue`.
Die Folien bleiben am ursprünglichen Ort. Im Themenordner verweist `sources/lecture.md` auf die
zugehörigen Originale und Seiten. In SiYuan erscheint die daraus erarbeitete Erklärung.

Nicht lesbare Folien werden als Lücke benannt. Falls sich PowerPoint-Dateien oder gescannte
Unterlagen mit den verfügbaren Werkzeugen nicht auswerten lassen, wird ein lesbarer PDF-Export
benötigt.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- Node.js — for the log hook and the SVG rasteriser (no npm dependencies)
- Chrome or Edge, optional — only for rendering geometric SVG diagrams
- Obsidian, optional — point `topicsRoot` at your vault and lessons land there, fully rendered

## What's in the box

| Piece | File | pi original |
|---|---|---|
| Teaching philosophy and process | `.claude/skills/teach/SKILL.md` | `skills/teach/` |
| Visualisation | `.claude/skills/visualize/SKILL.md` | `skills/visualize/` |
| Fact-checking subagent | `.claude/agents/researcher.md` | `agents/researcher.md` |
| Geometric diagram subagent | `.claude/agents/svg-maker.md` | `agents/svg-maker.md` |
| SVG → PNG rasteriser | `.claude/tools/render-svg.mjs` | `extensions/visual-tools/` |
| Session → Markdown log | `.claude/hooks/md-log.mjs` | `extensions/md-log.ts` |
| Local config and state | `.claude/learn.json` (git-ignored) | `/md-log` command |
| Graded quiz | `AskUserQuestion` + the quiz protocol in the `teach` skill | `extensions/quiz.ts` |
| Mermaid diagrams | Fenced ` ```mermaid ` blocks (Obsidian renders them natively) | `agents/mermaid-maker.md` |

## Configuration

`.claude/learn.json` is local to your machine and git-ignored, so your learning never ends up in a
commit. It is created from `.claude/learn.example.json` on first run.

| Key | Meaning |
|---|---|
| `language` | The language you are taught in — prose, quiz options, grading, everything |
| `math` | `"unicode"` (default, readable in the terminal: `f′(x) = 2x`) or `"latex"` (rendered in Obsidian). Quizzes always use Unicode |
| `topicsRoot` | Where topic folders live. Absolute (e.g. an Obsidian vault) or relative to the project |
| `topic` | The active topic slug. Changing topics is a question the tutor asks, not a silent switch |
| `labels` | Headings used inside `log.md`, so the log reads naturally in your language |
| `sessions` | Managed automatically — how much of each transcript has been mirrored. Don't edit |
| `siyuan` | Optional: publish the learning note in SiYuan (see below) |

### Reading learning notes in SiYuan

The teacher maintains `notes.md` as a standalone explanation in your configured language, with
worked examples and simple Markdown. The local `log.md` preserves conversation and quiz history;
internal agent messages, command markup and English quiz-tool wrappers are filtered out.

SiYuan stores notes in its own format, so pointing `topicsRoot` at its workspace does nothing.
The Stop hook publishes **only `notes.md`** through SiYuan's HTTP API, using one document per topic.
When the note changes, it replaces that document's body instead of appending conversation fragments.
Edit `notes.md` to change the generated reading view; edits made only in SiYuan will be replaced by
the next changed note. If `notes.md` is missing or empty, no content is pushed.

Existing transcript documents are backed up to `topics/<topic>/backups/` before their first
replacement. Failed updates retry the latest complete note on the next Stop, even if the transcript
has no new messages. You can also retry manually with `node .claude/hooks/md-log.mjs </dev/null`.
The API follows [SiYuan's official documentation](https://github.com/siyuan-note/siyuan/blob/master/docs/API.md).

| Key in `siyuan` | Meaning |
|---|---|
| `notebook` | Name of the notebook the documents go into (must exist) |
| `docs`, `assets`, `noteHashes`, `lastError` | Managed automatically. Hashes track the last successful note sync per topic. `lastError` records failed pushes. Delete a topic from `docs` to recreate its document. Legacy `pending` transcript text is discarded after successful note sync. |

The server address and the secrets go in `.env` (git-ignored; copy `.env.example`), not in `learn.json`, which the hook
rewrites every turn:

| Variable | Meaning |
|---|---|
| `SIYUAN_URL` | Your SiYuan server, e.g. `http://localhost:6806` or a public hostname |
| `SIYUAN_TOKEN` | SiYuan API token (*Settings → About*). Without it, nothing is pushed |
| `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` | Only if the server sits behind Cloudflare Access: a service token, allowed by a policy with action **Service Auth** |

Diagram embeds (`![[viz-….png]]`) are uploaded as SiYuan assets and linked. Needs Node ≥ 20.12.

## What this port adds

Two rules that are not in the original, both added because the evidence says the original is
under-specified rather than wrong:

- **The learner has to do the deriving.** The measured gains belong to the *learner* explaining,
  predicting and deriving (self-explanation g≈0.55, generation effect d≈0.40, productive failure
  g≈0.36). There is no evidence that an explanation merely *shaped* to feel discoverable retains
  better when read passively. So "how could I have discovered this?" pays only insofar as it makes
  you actually attempt the discovery. Two hard constraints come with it: never leave the learner
  unassisted (unguided discovery measures d = −0.38, *worse* than plain telling, against d = +0.50
  for guided), and always resolve the struggle afterwards.
- **Vary the position of the correct option.** The option-writing procedure says to write the
  correct claim first and mutate it into distractors — which, emitted in construction order, puts
  the answer at position 1 every single time. A learner spots that within three or four questions,
  and from then on position leaks the answer and the measurement is dead. This was found by a
  learner using this port, not by the model.

## Differences from the pi original

**Given up:**

- Quiz feedback arrives in the next message rather than instantly inside the popup.
- `AskUserQuestion` allows at most 4 options, and free text typed into its "Other" field never
  reaches the model. So "I don't know" is written as an explicit 4th option, leaving 3 real ones.
- Mermaid diagrams are not rendered and visually checked; Obsidian renders them directly. Geometric
  SVGs *are* checked — `svg-maker` rasterises to PNG and actually looks at the result.

**Gained:**

- Subagents don't depend on tmux; they run anywhere.
- `researcher` uses real web search tools.
- Setup is a clone and a launch. No extra runtime, no npm install.
- Topics are folders, so a session resumes from its own log instead of starting cold.

## Credit

The system, the philosophy and the original implementation are
[Eero Alvar's](https://github.com/amosblomqvist) — see
[amosblomqvist/learn](https://github.com/amosblomqvist/learn). This fork ports it to a different
runtime and adds the two rules above. The upstream repository carries no licence file; treat it as
all rights reserved and check with the author before redistributing.
