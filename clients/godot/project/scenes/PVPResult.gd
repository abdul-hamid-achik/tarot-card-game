extends Control

func _ready() -> void:
	$Back.pressed.connect(_back)

func set_result(winner_id: String, me_id: String) -> void:
	var won := (winner_id == me_id)
	$Label.text = won?"Victory": "Defeat"
	var gold := int(ProjectSettings.get_setting("tarot/pvp_last_gold", 0))
	$Rewards.text = "Rewards: +" + str(gold) + " Gold"

func _back() -> void:
	var menu := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu)
