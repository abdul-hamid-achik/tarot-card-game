extends Control

func _ready() -> void:
	$Back.pressed.connect(_back)

func set_result(winner_id: String, me_id: String) -> void:
	var won := (winner_id == me_id)
	$Label.text = won?"Victory": "Defeat"
	$Rewards.text = won?"Rewards: +50 Gold": "Rewards: +10 Gold"

func _back() -> void:
	var menu := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu)
