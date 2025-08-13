extends Node2D

@onready var label: Label = $Label
@onready var sprite: Sprite2D = $Sprite
var http: HTTPRequest

func set_card_name(card_name: String) -> void:
	label.text = card_name

func _ready() -> void:
	http = HTTPRequest.new()
	add_child(http)

func load_card_image(card_id: String, deck: String = "classic") -> void:
	var url := "http://localhost:3000/api/card-image?id=" + card_id.uri_encode() + "&deck=" + deck.uri_encode()
	http.request_completed.connect(_on_image)
	http.request(url)

func _on_image(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code != 200:
		return
	var img := Image.create_from_data(1, 1, false, Image.FORMAT_RGBA8, body) # let Godot detect size
	var tex := ImageTexture.create_from_image(img)
	sprite.texture = tex
