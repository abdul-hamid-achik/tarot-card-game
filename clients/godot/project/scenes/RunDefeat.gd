extends Control

func _ready() -> void:
	$Back.pressed.connect(_back)

func _back() -> void:
	var menu := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu)
