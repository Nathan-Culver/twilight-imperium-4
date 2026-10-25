# Implementation checklist — v0.1.1

This is an initial core-systems preview. It is **not** the requested comprehensive, precise digital replication of every base-game mechanism and asset. The remaining work is substantial and is recorded here rather than hidden as house rules.

## Implemented core flows

- Official 3/4/5/6-player preset system arrangements, alpha/beta adjacency, planet names, resource/influence values, traits and technology specialties in the component catalogue. Fixed preset setup is available; competitive galaxy drafting is not.
- Private choice of one of two starting secret objectives; two revealed stage-I public objectives; five stage-I and five stage-II cards in the public queue.
- Speaker-order strategy selection, two cards in 3/4-player games, initiative from the lowest card, strategy-card trade-good accumulation, and passing only after all held cards have been used.
- Primary/secondary decision flows for all eight strategy cards. Leadership purchases; Diplomacy protection/readiness; Politics speaker/cards; Construction structure limits; Trade goods and commodities; Warfare token removal/home production; Technology prerequisites and optional second research; Imperial scoring/Rex bonus or secret draw.
- Command pools, finite 16-token faction supply, activation locks, adjacency/pathfinding, enemy blocking, Antimass asteroid access, Light/Wave transit, one-ship Gravity Drive, fleet-supply checks and transport loading from several source systems.
- Simultaneous d10 space/ground combat, anti-fighter barrage, space cannon, casualty decisions, sustain damage, retreat declaration, bombardment, PDS shield, ground-force landings, control changes and exhausted captured planets.
- Space-dock production, unit-count limits, paired infantry/fighter cost, Sarween discount, ship component limits, blockade checks, capacity-loss choices, status repair/readiness and token redistribution.
- All 20 public-objective criteria, many status secret criteria, resource/influence/trade-good/token spend costs, public-objective home-control requirement, one public/one secret per status, Imperial scoring, immediate point victory and Imperium Rex end-of-deck victory.
- Local heuristic opponents at three difficulties. AI pauses on failed rules checks and for unfinished council resolution. Opponents’ hands are hidden in the interface.
- Mobile pointer/pinch/pan/tap/double-tap map, true-size SVG zoom, full-screen map, keyboard controls, detailed system dialogs, contextual help, next-decision guidance, autosave, checkpoints, portable JSON saves and local undo.

## Factions

Six factions are enabled with their factual home systems and starting components. **They remain partial implementations.**

| Faction | Automated examples | Remaining examples |
| --- | --- | --- |
| Sol | Versatile, Orbital Drop, Advanced Carrier capacity, Spec Ops combat values | All flagship/upgrade exceptions, Infantry II revival timings |
| Hacan | Six commodities, distant trade, free Trade secondary | Action-card trading, faction-tech actions, flagship spending |
| Letnev | Armada, selected flagship combat/bombardment and Non-Euclidean sustain | Munitions Reserves, flagship repair, exact faction-tech exceptions |
| Jol-Nar | Fragile, Analytical, Brilliant’s Technology secondary use | Flagship special dice results, E-Res activation triggers |
| Sardakk N’orr | Unrelenting, Exotrireme bombardment profile | Flagship support bonus, Exotrireme sacrifice, Valkyrie timing |
| Xxcha | Optional Peace Accords choice after Diplomacy | Quash, flagship space-cannon coverage, faction-tech cancel windows |

Arborec, Saar, Muaat, Creuss, L1Z1X, Mentak, Naalu, Nekro, Winnu, Yin and Yssaril are reference-only and cannot be selected in this build. Their abilities are not replaced with generic equivalents.

## Important remaining work

1. **Action cards and responses.** The base 80-card deck is present; seven Action-timing cards have reducers (Mining Initiative, Industrial Initiative, Economic Initiative, Frontline Deployment, Unexpected Action, Rise of a Messiah, Focused Research). Other cards are visibly marked as not automated. AI does not play unimplemented effects. Sabotage, Direct Hit and other response windows, riders, competing timing, same-name restrictions and declined optional firing are unfinished. This materially affects balance and fidelity.
2. **Agenda phase.** The UI currently records For/Against votes and assisted outcome notes. It does not draw a complete agenda deck, resolve election-target agendas, implement law/directive reducers, or enforce ongoing agenda effects. It pauses for a human review. Council notes do not change game state. This is not a fully automated solo TI4 campaign.
3. **Promissory notes and deals.** Commodity/trade-good transactions are implemented, but all four common promissory notes, faction notes, Support for the Throne, private deals and action-card exchange need implementation.
4. **Technology abilities.** Prerequisites, basic unit upgrades and several common passive effects are implemented. Specialty skips are not exposed in the UI. Full card effects for X-89, Magen, Duranium, Transit Diodes, Integrated Economy and many faction technologies remain unfinished. Some researched technologies currently confer only their implemented attributes; consult TECH_HELP and this checklist.
5. **Combat and movement exceptions.** Exact simultaneous pre-combat ordering, optional multi-owner space-cannon targets, Graviton, Bombardment Plasma allocation, all flagship interactions, Harrow, infantry revival, all Fighter II edge cases, transport assignment for gravity-rift destruction, gravity-rift movement/risk, retreat capacity/fleet enforcement, and friendly capacity changes at source systems need further work. Assault Cannon destroys a non-fighter with no sustain, but its pre-barrage sequencing still needs audit.
6. **Strategy details.** Politics agenda inspection is unfinished. Warfare’s engine accepts token redistribution but the interface does not expose it yet. Full Construction-token physical-supply edge cases and every strategy optional-effect timing need audit. Some legal choices use automatic payment/unit-placement choices rather than a complete selection interface.
7. **Scoring and elimination.** Several action-secret triggers are event approximations or absent. Exact immediate secret timing, elimination, reassignable political VP, objective/state exceptions and all game-ending tie interactions need a physical-rule audit.
8. **Assets.** Original vector artwork is used. Complete original card illustrations, faction-sheet art, planet art, miniature models and physical token graphics are not reproduced.
9. **Variants and expansion material.** Advanced competitive map construction and all expansion/Codex content are outside this initial release. No alternate simplified combat, artificial victory timer or replacement scoring rule is intentionally substituted for an unfinished official mechanism.

## Validation

Regression checks cover component counts, preset tile uniqueness and home counts, strategy counts and initiative, payments, prerequisites, transactional rejection, serialization, home-control scoring, transport and invasion, activation locks, sustain damage, the 80-card deck, hand-limit interrupts and immediate Imperial victory.

The 12 all-AI flow simulations cover 3–6 players at Easy/Normal/Hard. Each reaches a point victory or the normal public-deck exhaustion condition. **The harness explicitly records empty council effects to exercise phase transitions; these results do not demonstrate complete official-rule fidelity or a fully automated agenda phase.** Physical-set comparison and independent rules playtesting remain necessary.
