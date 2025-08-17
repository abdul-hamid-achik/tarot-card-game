extends Control

func _ready() -> void:
	var back := $Back
	if back and not back.pressed.is_connected(_back):
		back.pressed.connect(_back)

func _back() -> void:
	var menu: PackedScene = load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu)
