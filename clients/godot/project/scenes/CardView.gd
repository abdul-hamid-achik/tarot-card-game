extends Node2D

@onready var label: Label = $Label
@onready var sprite: Sprite2D = $Sprite
@onready var area: Area2D = $Area2D
var http: HTTPRequest
var last_card_id := ""
var last_deck := "classic"
var tried_fallback := false
var is_face_down := false
var card_data := {}

# Drag and drop
var is_dragging := false
var drag_offset := Vector2.ZERO
var original_position := Vector2.ZERO
var original_parent: Node = null
var can_be_dragged := true

signal clicked
signal preview_requested
signal drag_started
signal drag_ended
signal dropped_on_board

func _api_origin() -> String:
	var env := OS.get_environment("TAROT_API_ORIGIN")
	if env != "":
		return env
	if OS.has_feature("web"):
		var origin: String = str(JavaScriptBridge.eval("location.origin"))
		if origin != "":
			return origin
	return "http://localhost:3000"

func set_card_name(card_name: String) -> void:
	label.text = card_name if not is_face_down else ""

func set_card_back(face_down: bool = true) -> void:
	is_face_down = face_down
	if is_face_down:
		label.text = ""
		# Load card back image (use themed placeholder/back)
		var url := _api_origin() + "/api/ui/themes/pixel-pack/others/card_ui_white_placeholder.png"
		if not http:
			http = HTTPRequest.new()
			add_child(http)
		if not http.request_completed.is_connected(_on_back_image):
			http.request_completed.connect(_on_back_image)
		http.request(url)
	else:
		label.text = card_data.get("name", "")

func _on_back_image(_result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code != 200:
		return
	var img := Image.new()
	if img.load_png_from_buffer(body) != OK:
		return
	var tex := ImageTexture.create_from_image(img)
	sprite.texture = tex

func _ready() -> void:
	http = HTTPRequest.new()
	add_child(http)
	if not area.input_event.is_connected(_on_area_input):
		area.input_event.connect(_on_area_input)
    # Also listen on the Sprite for clicks in case Area2D misses
    if not sprite.input_event.is_connected(_on_area_input):
        sprite.input_event.connect(_on_area_input)
	# Ensure _process runs for dragging updates
	set_process(true)
	# Make sure the Area2D participates in input/overlap
	area.monitoring = true
	area.input_pickable = true

func _unhandled_input(event: InputEvent) -> void:
    var mb := event as InputEventMouseButton
    if mb and mb.button_index == MOUSE_BUTTON_LEFT:
        if mb.pressed:
            if can_be_dragged and not is_face_down:
                # Start dragging even if Area2D didn't capture
                is_dragging = true
                drag_offset = global_position - mb.global_position
                original_position = position
                original_parent = get_parent()
                z_index = 10
                emit_signal("drag_started")
        else:
            # Mouse released
            if is_dragging:
                is_dragging = false
                z_index = 0
                emit_signal("drag_ended")
                _check_drop_zone()

func load_card_image(card_id: String, deck: String = "classic") -> void:
	last_card_id = card_id
	last_deck = deck
	tried_fallback = false
	var url := _api_origin() + "/api/card-image?id=" + card_id.uri_encode() + "&deck=" + deck.uri_encode()
	# Avoid duplicate connections if called multiple times
	if not http.request_completed.is_connected(_on_image):
		http.request_completed.connect(_on_image)
	http.request(url)

func _on_image(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code != 200:
		# Fallback once to a known-good image
		if not tried_fallback:
			tried_fallback = true
			var url := _api_origin() + "/api/card-image?id=" + "major_00".uri_encode() + "&deck=" + last_deck.uri_encode()
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
	if mb:
		if mb.button_index == MOUSE_BUTTON_LEFT:
			if mb.pressed:
				if can_be_dragged and not is_face_down:
					# Start dragging
					is_dragging = true
					drag_offset = global_position - mb.global_position
					original_position = position
					original_parent = get_parent()
					z_index = 10 # Bring to front
					emit_signal("drag_started")
			else:
				# Stop dragging
				if is_dragging:
					is_dragging = false
					z_index = 0
					emit_signal("drag_ended")
					_check_drop_zone()
				else:
					# Regular click for preview
					emit_signal("clicked")
					emit_signal("preview_requested")
		elif mb.button_index == MOUSE_BUTTON_RIGHT and mb.pressed:
			# Right click for preview only
			emit_signal("preview_requested")

func _process(_delta: float) -> void:
	if is_dragging:
		global_position = get_global_mouse_position() + drag_offset
		
func _check_drop_zone() -> void:
	# Check if dropped on a valid board zone
	var board_area := _find_board_drop_zone()
	if board_area:
		emit_signal("dropped_on_board")
	else:
		# If the card was reparented or moved by game logic during drag, don't snap back
		if get_parent() != original_parent or get_meta("zone", "") != "player_hand":
			return
		# Otherwise return to original position
		var tween := create_tween()
		tween.set_trans(Tween.TRANS_CUBIC)
		tween.set_ease(Tween.EASE_OUT)
		tween.tween_property(self, "position", original_position, 0.3)

func _find_board_drop_zone() -> Area2D:
	# Check for overlapping board drop zones
	var overlapping := area.get_overlapping_areas()
	for a in overlapping:
		if a.has_meta("drop_zone") and a.get_meta("drop_zone") == "board":
			return a
	return null
