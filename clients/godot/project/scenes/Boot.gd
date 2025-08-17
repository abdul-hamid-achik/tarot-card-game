extends Node

@onready var timer := Timer.new()

func _ready() -> void:
	# Minimal boot: queue a splash after one frame
	add_child(timer)
	timer.one_shot = true
	timer.wait_time = 0.01
	timer.timeout.connect(_to_splash)
	timer.start()

func _to_splash() -> void:
	var splash: PackedScene = load("res://scenes/Splash.tscn")
	get_tree().change_scene_to_packed(splash)
