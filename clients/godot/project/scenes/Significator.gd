extends Control

var selected_significator := ""

func _ready() -> void:
	var fool := $Options/Fool
	var mage := $Options/Magician
	var start_btn := $Start
	var back := $Back
	if fool and not fool.pressed.is_connected(_pick_fool):
		fool.pressed.connect(_pick_fool)
	if mage and not mage.pressed.is_connected(_pick_magician):
		mage.pressed.connect(_pick_magician)
	if start_btn and not start_btn.pressed.is_connected(_start):
		start_btn.pressed.connect(_start)
	if back and not back.pressed.is_connected(_back):
		back.pressed.connect(_back)

func _pick_fool() -> void:
	selected_significator = "major_00"
	$Start.disabled = false

func _pick_magician() -> void:
	selected_significator = "major_01"
	$Start.disabled = false

func _start() -> void:
	var map_scene := load("res://scenes/PvEMap.tscn")
	var instance: Node = map_scene.instantiate()
	instance.set_meta("significator", selected_significator)
	get_tree().root.add_child(instance)
	queue_free()

func _back() -> void:
	var menu := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu)
