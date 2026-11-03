# Gamepanion

A companion for the games you play: you tell it what happened while you play, it files it, and it shows you only what you have found.

## Language

**Gamepanion**:
The companion the player talks to while they play, through Claude or the in-app chat; it files what they say and gives it back when they return. Each player has their own: "your Gamepanion".
_Avoid_: questlog (the old name, ADR 0017), the app, the tracker, almanac, book

**To-do**:
An errand the player keeps while playing that is neither a quest nor a goal ("farm 5 crystals", "come back with the key"), in their own words, optionally about one quest, item or codex entry; open until they say it is done (ADR 0020). One Claude proposes is a suggested to-do until the player takes it.
_Avoid_: task, reminder, goal (a goal is where the player wants to get to; ADR 0009)
