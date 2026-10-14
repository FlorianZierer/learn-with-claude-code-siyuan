# Lernprojekt

`/teach_import` führt `.claude/skills/teach_import/SKILL.md` aus: Unterlagen aus `materials/`
oder einem genannten Pfad auswerten, belegte Lernthemen vorschlagen und erst nach Auswahl
eine Lernsession beginnen. Bei der Folienanalyse noch keine Einstiegsbefragung starten.

`/teach_continue` führt den Ablauf in `.claude/skills/teach_continue/SKILL.md` aus:
erst bisherige Lernthemen zur Auswahl anbieten, dann am gewählten Lernstand fortsetzen.

Bei Lernanfragen, auch „weiter mit …“ oder „für heute Schluss“, verwende den Ablauf aus
`.claude/skills/teach/SKILL.md`. Lies zuerst `TEACHER.md` als persönliches Lehrerprofil und
`.claude/learn.json` für das aktive Thema und die technischen Einstellungen.

Lies zum Fortsetzen `<topicsRoot>/<topic>/progress.md`. Ein neuer Chat oder ein neuer Tag
ist kein Grund, eine abgeschlossene Einstiegsbefragung erneut zu starten. Falls der Lernstand
fehlt, rekonstruiere ihn aus `log.md`. `notes.md` ist die Erklärung zum Nachlesen und kein
Beleg dafür, dass der Lernende bereits alles verstanden hat.

Aktualisiere `progress.md` nach inhaltlichen Lernrunden und vor einer Lernpause. Pflege
`notes.md` als Lernnotiz in der Sprache des Lehrerprofils; der Stop-Hook überträgt sie nach SiYuan.

Bei Arbeiten am Projektcode oder an der Konfiguration starte keine Lernbefragung.
