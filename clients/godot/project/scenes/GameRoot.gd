extends Node2D

@onready var http := HTTPRequest.new()
@onready var label: Label = $Label
@onready var connect_button: Button = $ConnectButton
@onready var sse := HTTPRequest.new()

func _ready() -> void:
	add_child(http)
	add_child(sse)
	http.request_completed.connect(_on_health_response)
	# Simple ping to backend health endpoint (requires local web dev server)
	http.request("http://localhost:3000/api/health")
	connect_button.pressed.connect(_on_connect_stream)

func _on_health_response(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code == 200:
		label.text = "Tarot TCG — API OK"
	else:
		label.text = "Tarot TCG — API ERROR"

func _on_connect_stream() -> void:
	# SSE is not natively supported; we can still fetch a few lines for demo
	sse.request("http://localhost:3000/api/match/stream?steps=10")
