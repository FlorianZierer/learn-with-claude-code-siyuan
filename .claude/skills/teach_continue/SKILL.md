---
name: teach_continue
description: Bisherige Lernthemen zur Auswahl anzeigen und am gespeicherten Lernstand fortsetzen. Verwenden, wenn der Nutzer ein früheres Lernthema auswählen und weiterlernen möchte; neue Themen starten mit /teach.
---

# Lernen fortsetzen

Führe eine Themenauswahl durch und setze danach die gewählte Lernsession fort.
Die Auswahl ist keine Wissensfrage. Beginne vor der Auswahl weder eine Lektion noch eine
Vorwissensbefragung.

## Vorhandene Themen ermitteln

1. Lies `TEACHER.md` und, falls vorhanden, `.claude/learn.json` im Projektverzeichnis.
2. Verwende `topicsRoot` aus der Konfiguration, ansonsten `topics/`. Relative Pfade beziehen
   sich auf das Projektverzeichnis, absolute Pfade bleiben unverändert.
3. Suche in den direkten Unterordnern nach nicht leeren `progress.md`- oder `log.md`-Dateien.
   Diese Ordner sind die bisherigen Lernthemen. Berücksichtige ignorierte Dateien: `topics/`
   ist absichtlich git-ignoriert. Verwende zum Beispiel `rg --files --hidden --no-ignore`
   oder eine direkte Verzeichnisauflistung. Bloße `sources/`-, `viz/`- oder Notizordner ohne
   Lernverlauf zählen nicht als bereits besprochenes Thema.
4. Lies für die Übersicht die Lernstände, ersatzweise den Anfang und das Ende der Logs.
   Ermittle pro Thema den lesbaren Titel, den nächsten Lernschritt und, soweit vorhanden,
   das Datum der letzten Lernrunde. Erfinde keine Fortschritte. Behalte den tatsächlichen
   Ordnernamen als eindeutige Kennung; unterschiedliche Ordner können denselben Titel haben.
5. Zeige das aktive Thema zuerst, danach die zuletzt bearbeiteten Themen. Verwende bei
   fehlenden Datumsangaben die Dateizeit als Sortierhilfe, nicht als behauptetes Lerndatum.

Wenn keine bisherigen Themen vorhanden sind, erkläre das kurz und verweise auf
`/teach <Thema>`. Erstelle kein Thema und ändere die Konfiguration nicht.

## Thema auswählen lassen

Verwende `AskUserQuestion` mit einer einzigen Frage, in der Sprache des Lehrerprofils:
„Welches Thema möchtest du fortsetzen?“ (`header`: „Weiterlernen“, `multiSelect`: false).

- Eine Option pro Thema: Titel als `label`, letzter Stand bzw. nächster Schritt als kurze
  `description`. Beispiel: „Gradient Descent“ — „Weiter bei Steigung aus zwei Punkten“.
- Zeige auch bei nur einem Thema eine Auswahl: dieses Thema und „Abbrechen“.
- Bei zwei bis vier Themen passen alle in eine Auswahl. Bei mehr Themen zeige höchstens
  drei Themen plus „Weitere Themen“. Blättere damit durch die übrigen Themen; auf der
  letzten Seite führt „Zur ersten Seite“ zurück. Jede Seite hat zwei bis vier Optionen.
- Falls `AskUserQuestion` nicht verfügbar ist, zeige eine nummerierte Liste und warte
  auf die Auswahl. Freitext, der nicht eindeutig einem Thema entspricht, ist keine Auswahl:
  kläre nur, welches Thema gemeint ist.
- Bei Abbruch nicht fortsetzen und den aktiven Themenwert unverändert lassen.

## Am gespeicherten Stand fortsetzen

Nach einer eindeutigen Auswahl:

1. Lies `.claude/skills/teach/SKILL.md` und folge dessen Fortsetzungsablauf. Die Themenauswahl
   ist bereits die Zustimmung zum Themenwechsel; frage nicht noch einmal danach.
2. Sichere gegebenenfalls noch ungespeicherten Lernfortschritt des bisherigen Themas in
   dessen `progress.md`, bevor du wechselst.
3. Setze in `.claude/learn.json` ausschließlich `topic` auf den tatsächlichen Ordnernamen.
   Bewahre alle anderen Einstellungen, SiYuan-Zuordnungen und Transkript-Zähler. Fehlt die
   Konfiguration, verwende die Vorlage und die bereits vorhandenen Profil-/Ordnerangaben.
4. Lies `progress.md`, `notes.md` und relevante letzte Einträge von `log.md` des ausgewählten
   Themas. Fehlt `progress.md`, rekonstruiere den Stand aus dem Log. Eine vollständige Notiz
   ist kein Nachweis, dass ihr Inhalt bereits verstanden wurde.
5. Gib höchstens zwei Orientierungssätze und fahre mit dem gespeicherten nächsten Schritt
   fort. Wiederhole keine abgeschlossenen Einstiegsfragen oder Planungsphasen. Ist eine
   Frage offen, knüpfe dort an. Fehlt eine entscheidende Information, kläre nur diese Lücke.
6. Pflege anschließend `progress.md` und `notes.md` wie im Lehrablauf beschrieben.
