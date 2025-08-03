extends Node2D

@onready var label: Label = $Label
var ws := WebSocketPeer.new()
var connected := false

func _process(_delta: float) -> void:
	if connected:
		ws.poll()
		while ws.get_available_packet_count() > 0:
			var pkt := ws.get_packet().get_string_from_utf8()
			label.text = "WS: " + pkt

func connect_ws(url := "ws://localhost:8787") -> void:
	var err := ws.connect_to_url(url)
	if err == OK:
		connected = true
		label.text = "WS: connecting..."
		# Subscribe to a demo stream
		var sub := {"type": "subscribe", "seed": "ws-seed", "players": ["P1","P2"], "steps": 20}
		ws.send_text(JSON.stringify(sub))
	else:
		label.text = "WS: connect error"
