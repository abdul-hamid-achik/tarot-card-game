# Godot Client (skeleton)

This directory contains a minimal Godot 4 project scaffold at `project/` with scenes:
- `GameRoot.tscn` (script `GameRoot.gd` pings `/api/health` on startup)
- `Board.tscn`
- `Hand.tscn`

Next steps:
- Open `project/` in Godot 4 and run the scene
- Add WebSocket/SSE client scripts to connect to `/api/match/stream` (or future WS)
- Add `CardView.tscn` and initial UI layout
- Add GUT tests for isolated systems
