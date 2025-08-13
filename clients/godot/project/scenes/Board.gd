extends Node2D

@onready var label: Label = $Label
@onready var http := HTTPRequest.new()
@onready var card_scene: PackedScene = preload("res://scenes/CardView.tscn")
var deck := "classic"

func _ready() -> void:
	label.text = "Board (ready)"
	add_child(http)
	http.request("http://localhost:3000/api/cards")
	http.request_completed.connect(_on_cards_response)

func _on_cards_response(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code != 200:
		return
	var text := body.get_string_from_utf8()
	var data := JSON.parse_string(text)
	if typeof(data) != TYPE_DICTIONARY:
		return
	var y := 140
	for card in data.get("cards", []):
		var inst := card_scene.instantiate()
		inst.position = Vector2(180, y)
		y += 24
		inst.set_card_name(card.get("name", "Card"))
		if inst.has_method("load_card_image"):
			inst.load_card_image(card.get("id", "major_00"), deck)
		add_child(inst)
