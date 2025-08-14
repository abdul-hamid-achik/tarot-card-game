extends Control

@onready var pve_button: Button = $VBoxContainer/PVEButton
@onready var pvp_button: Button = $VBoxContainer/PVPButton
@onready var decks_button: Button = $VBoxContainer/DecksButton
@onready var settings_button: Button = $VBoxContainer/SettingsButton

func _ready() -> void:
	pve_button.pressed.connect(_on_pve)
	pvp_button.pressed.connect(_on_pvp)
	decks_button.pressed.connect(_on_decks)
	settings_button.pressed.connect(_on_settings)

func _on_pve() -> void:
	# Load PvE Map for roguelike mode
	var scene: PackedScene = load("res://scenes/PvEMap.tscn")
	get_tree().change_scene_to_packed(scene)

func _on_pvp() -> void:
	# Load GameBoard scene for PvP
	var scene: PackedScene = load("res://scenes/GameBoard.tscn")
	var instance := scene.instantiate()
	instance.set_meta("game_mode", "pvp")
	get_tree().root.add_child(instance)
	queue_free()

func _on_decks() -> void:
	# Placeholder
	print("Decks clicked")

func _on_settings() -> void:
	# Placeholder
	print("Settings clicked")

func _api_origin() -> String:
	if OS.has_feature("web"):
		var origin: String = str(JavaScriptBridge.eval("location.origin"))
		if origin != "":
			return origin
	return "http://localhost:3000"
