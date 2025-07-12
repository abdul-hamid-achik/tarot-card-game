extends Node2D

@onready var http := HTTPRequest.new()
@onready var label: Label = $Label

func _ready() -> void:
	add_child(http)
	http.request_completed.connect(_on_health_response)
	# Simple ping to backend health endpoint (requires local web dev server)
	http.request("http://localhost:3000/api/health")

func _on_health_response(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code == 200:
		label.text = "Tarot TCG — API OK"
	else:
		label.text = "Tarot TCG — API ERROR"
