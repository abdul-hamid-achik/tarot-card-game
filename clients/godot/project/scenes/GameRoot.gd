extends Node2D

@onready var http := HTTPRequest.new()
@onready var label: Label = $Label
@onready var connect_button: Button = $ConnectButton
@onready var sse := HTTPRequest.new()
@onready var stream_log: Node = $StreamLog

func _api_origin() -> String:
	if OS.has_feature("web"):
		var origin: String = str(JavaScriptBridge.eval("location.origin"))
		if origin != "":
			return origin
	return "http://localhost:3000"

func _ready() -> void:
	add_child(http)
	add_child(sse)
	http.request_completed.connect(_on_health_response)
	# Simple ping to backend health endpoint when served under /godot
	http.request(_api_origin() + "/api/health")
	connect_button.pressed.connect(_on_connect_stream)

func _on_health_response(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code == 200:
		label.text = "Tarot TCG — API OK"
	else:
		label.text = "Tarot TCG — API ERROR"

func _on_connect_stream() -> void:
	# SSE is not natively supported; demo: fetch one replay and append steps to StreamLog
	sse.request_completed.connect(_on_sse)
	sse.request(_api_origin() + "/api/match/stream?steps=10")

func _on_sse(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code != 200:
		return
	var text := body.get_string_from_utf8()
	for line in text.split("\n"):
		if line.begins_with("data: "):
			var payload := line.substr(6, line.length()).strip_edges()
			if stream_log and stream_log.has_method("append_line"):
				stream_log.call("append_line", payload)
