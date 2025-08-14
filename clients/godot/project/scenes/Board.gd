extends Node2D

@onready var label: Label = $Label
@onready var background: Sprite2D = $Background
@onready var http := HTTPRequest.new()
@onready var card_scene: PackedScene = preload("res://scenes/CardView.tscn")
var deck := "classic"
var hand_positions: Array[Vector2] = [
	Vector2(200, 420), Vector2(380, 420), Vector2(560, 420), Vector2(740, 420)
]
var board_positions: Array[Vector2] = [
	Vector2(380, 260), Vector2(560, 260), Vector2(740, 260)
]
var hand_nodes: Array[Node] = []
var board_nodes: Array[Node] = []

func _api_origin() -> String:
	if OS.has_feature("web"):
		var origin: String = str(JavaScriptBridge.eval("location.origin"))
		if origin != "":
			return origin
	return "http://localhost:3000"

func _ready() -> void:
	label.text = "Board (ready)"
	add_child(http)
	http.request(_api_origin() + "/api/cards")
	http.request_completed.connect(_on_cards_response)
	# Fetch one background image from packaged UI assets and display it
	var bg_req := HTTPRequest.new()
	add_child(bg_req)
	bg_req.request_completed.connect(_on_bg)
	bg_req.request(_api_origin() + "/api/ui/themes/pixel-pack/backgrounds/table_bg_04.png")
	# Anchor background to the top-left so it fills predictably
	background.centered = false

func _on_cards_response(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code != 200:
		return
	var text := body.get_string_from_utf8()
	var data = JSON.parse_string(text)
	if typeof(data) != TYPE_DICTIONARY:
		return
	# Fill hand with up to 4 cards
	var idx := 0
	for card in data.get("cards", []):
		if idx >= hand_positions.size():
			break
		var inst := card_scene.instantiate()
		inst.position = hand_positions[idx]
		idx += 1
		inst.set_card_name(card.get("name", "Card"))
		if inst.has_method("load_card_image"):
			inst.load_card_image(card.get("id", "major_00"), deck)
		add_child(inst)
		hand_nodes.append(inst)
		# Connect click to move-to-board
		if inst.has_signal("clicked") and not inst.clicked.is_connected(_on_card_clicked):
			inst.clicked.connect(_on_card_clicked.bind(inst))

func _on_bg(_r: int, code: int, _h: PackedStringArray, body: PackedByteArray) -> void:
	if code != 200:
		return
	var img := Image.new()
	if img.load_png_from_buffer(body) != OK:
		return
	var tex := ImageTexture.create_from_image(img)
	background.texture = tex

func _on_card_clicked(inst: Node) -> void:
	# Find first free board slot
	for i in range(board_positions.size()):
		var slot_taken := false
		for n in board_nodes:
			if n.position.distance_to(board_positions[i]) < 4.0:
				slot_taken = true
				break
		if slot_taken:
			continue
		# Move from hand to board
		hand_nodes.erase(inst)
		inst.position = board_positions[i]
		board_nodes.append(inst)
		break
