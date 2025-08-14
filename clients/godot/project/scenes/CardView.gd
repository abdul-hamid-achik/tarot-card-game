extends Node2D

@onready var label: Label = $Label
@onready var sprite: Sprite2D = $Sprite
@onready var area: Area2D = $Area2D
var http: HTTPRequest
var last_card_id := ""
var last_deck := "classic"
var tried_fallback := false
signal clicked

func set_card_name(card_name: String) -> void:
	label.text = card_name

func _ready() -> void:
	http = HTTPRequest.new()
	add_child(http)
	if not area.input_event.is_connected(_on_area_input):
		area.input_event.connect(_on_area_input)

func load_card_image(card_id: String, deck: String = "classic") -> void:
	last_card_id = card_id
	last_deck = deck
	tried_fallback = false
    var origin := "http://localhost:3000"
    if OS.has_feature("web"):
        var o: String = str(JavaScriptBridge.eval("location.origin"))
        if o != "":
            origin = o
    var url := origin + "/api/card-image?id=" + card_id.uri_encode() + "&deck=" + deck.uri_encode()
	# Avoid duplicate connections if called multiple times
	if not http.request_completed.is_connected(_on_image):
		http.request_completed.connect(_on_image)
	http.request(url)

func _on_image(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code != 200:
		# Fallback once to a known-good image
        if not tried_fallback:
			tried_fallback = true
            var origin := "http://localhost:3000"
            if OS.has_feature("web"):
                var o: String = str(JavaScriptBridge.eval("location.origin"))
                if o != "":
                    origin = o
            var url := origin + "/api/card-image?id=" + "major_00".uri_encode() + "&deck=" + last_deck.uri_encode()
			http.request(url)
		return
	var img := Image.new()
	var ok := img.load_png_from_buffer(body)
	if ok != OK:
		return
	var tex := ImageTexture.create_from_image(img)
	sprite.texture = tex

func _on_area_input(_vp: Node, event: InputEvent, _shape_idx: int) -> void:
	var mb := event as InputEventMouseButton
	if mb and mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
		emit_signal("clicked")
