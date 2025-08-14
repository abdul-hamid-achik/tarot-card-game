extends Node2D

@onready var button: Button = $Button
@onready var http := HTTPRequest.new()

func _api_origin() -> String:
	var env := OS.get_environment("TAROT_API_ORIGIN")
	if env != "":
		return env
	if OS.has_feature("web"):
		var origin: String = str(JavaScriptBridge.eval("location.origin"))
		if origin != "":
			return origin
	return "http://localhost:3000"

func _ready() -> void:
	add_child(http)
	button.pressed.connect(_on_press)

func _on_press() -> void:
	http.request(_api_origin() + "/api/match/queue", ["Content-Type: application/json"], HTTPClient.METHOD_POST, "{\"userId\":\"GODOT\"}")
	http.request_completed.connect(_on_queue_done)

func _on_queue_done(result: int, code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	if code != 200:
		return
	# Poll result once
	var req := HTTPRequest.new()
	add_child(req)
	req.request_completed.connect(_on_result)
	req.request(_api_origin() + "/api/match/result?userId=GODOT")

func _on_result(result: int, code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	if code != 200:
		return
	var text := body.get_string_from_utf8()
	print("Result:", text)
