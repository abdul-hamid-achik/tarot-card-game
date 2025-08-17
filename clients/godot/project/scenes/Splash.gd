extends Control

@onready var bar: ProgressBar = $ProgressBar
@onready var timer := Timer.new()

var load_progress := 0.0

func _ready() -> void:
	add_child(timer)
	timer.wait_time = 0.05
	timer.timeout.connect(_tick)
	timer.start()

func _tick() -> void:
	load_progress = min(1.0, load_progress + 0.05)
	bar.value = load_progress * 100.0
	if load_progress >= 1.0:
		timer.stop()
		var menu: PackedScene = load("res://scenes/Menu.tscn")
		get_tree().change_scene_to_packed(menu)
