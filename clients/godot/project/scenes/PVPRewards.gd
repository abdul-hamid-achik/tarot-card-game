extends Control

var next_scene: PackedScene

func _ready() -> void:
	$Panel/Continue.pressed.connect(_on_continue)

func set_rewards(rewards: Dictionary, winner_id: String, me_id: String) -> void:
	var lines := []
	if rewards.has("gold"):
		lines.append("[b]Gold:[/b] +" + str(int(rewards.get("gold"))))
	if rewards.has("cards") and rewards["cards"] is Array:
		var cards := rewards["cards"]
		lines.append("[b]Cards:[/b] " + ", ".join(cards))
	$Panel/Details.text = "\n".join(lines)
	# Next scene after rewards
	next_scene = load("res://scenes/PVPResult.tscn")
	var inst := next_scene.instantiate()
	if inst and inst.has_method("set_result"):
		inst.call_deferred("set_result", winner_id, me_id)

func _on_continue() -> void:
	if next_scene:
		get_tree().change_scene_to_packed(next_scene)
	else:
		var menu := load("res://scenes/Menu.tscn")
		get_tree().change_scene_to_packed(menu)
