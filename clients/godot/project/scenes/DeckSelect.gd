extends Control

var selected_deck := ""

func _ready() -> void:
	$Options/Classic.pressed.connect(_pick.bind("classic"))
	$Options/ArcanaA.pressed.connect(_pick.bind("arcana-a"))
	$Options/Marigold.pressed.connect(_pick.bind("marigold"))
	$Save.pressed.connect(_save)
	$Back.pressed.connect(_back)

func _pick(name: String) -> void:
	selected_deck = name
	$Save.disabled = false

func _save() -> void:
	ProjectSettings.set_setting("tarot/player_deck", selected_deck)
	ProjectSettings.save()
	_back()

func _back() -> void:
	var menu := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu)
