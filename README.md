# Twilight Imperium IV · The Situation Room

An unofficial, mobile-first **core-systems preview** of the base fourth-edition board game. Original browser implementation and original scalable vector artwork. This is not an exhaustive or certified rules implementation.

The initial build has six enabled civilizations (Sol, Hacan, Letnev, Jol-Nar, Sardakk N’orr and Xxcha), 3–6-player official preset maps, local Easy/Normal/Hard heuristic AI, strategy and tactical decisions, production, research, objectives, saves, touch navigation and contextual help.

**Read [the implementation checklist](docs/STATUS.md) before playing.** Eleven factions remain reference-only. Many card timing windows, special technologies, flagship exceptions, promissory notes and agenda effects are unfinished. The council currently requires assisted adjudication. A recorded council outcome is a note, not automatic enforcement of its effects.

## Run

This is a static ES-module app. Serve the repository through a static web server, or build its `dist/` directory with `npm run build`. There are no package dependencies. `npm test` runs the regression checks. `node tests/campaigns.mjs` exercises campaign flow for all player counts and AI levels; it intentionally bypasses agenda effects and is not a full-fidelity TI4 playtest.

## Saves

Actions autosave in browser storage. Archive provides three checkpoints plus JSON download/import between devices. Back up downloaded files before clearing browser data. Saves contain all private game information. AI choices use their own private information and visible public state.

## Source and ownership

Rules and setup references are listed in [docs/SOURCES.md](docs/SOURCES.md). Twilight Imperium and its original game assets belong to Fantasy Flight Games and their creators. This project is unofficial and is not endorsed by the publisher. It does not include card scans, faction-sheet scans or miniature models. Code-native art is original; factual component names and values are references to the board game.
