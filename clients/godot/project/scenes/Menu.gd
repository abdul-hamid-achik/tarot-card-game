extends Control

@onready var pve_button: Button = $VBoxContainer/PVEButton
@onready var pvp_button: Button = $VBoxContainer/PVPButton
@onready var decks_button: Button = $VBoxContainer/DecksButton
@onready var settings_button: Button = $VBoxContainer/SettingsButton
@onready var collection_button: Button = $VBoxContainer/CollectionButton
@onready var deck_select_button: Button = $VBoxContainer/DeckSelectButton

func _ready() -> void:
	pve_button.pressed.connect(_on_pve)
	pvp_button.pressed.connect(_on_pvp)
	decks_button.pressed.connect(_on_decks)
	settings_button.pressed.connect(_on_settings)
	collection_button.pressed.connect(_on_collection)
	deck_select_button.pressed.connect(_on_deck_select)

func _on_pve() -> void:
	# Route to Significator selection first
	var scene: PackedScene = load("res://scenes/Significator.tscn")
	get_tree().change_scene_to_packed(scene)

func _on_pvp() -> void:
	# Load GameBoard scene for PvP
	var scene: PackedScene = load("res://scenes/GameBoard.tscn")
	get_tree().change_scene_to_packed(scene)

func _on_decks() -> void:
	var scene: PackedScene = load("res://scenes/DeckBuilder.tscn")
	get_tree().change_scene_to_packed(scene)

func _on_settings() -> void:
	var scene: PackedScene = load("res://scenes/Settings.tscn")
	get_tree().change_scene_to_packed(scene)

func _on_collection() -> void:
	var scene: PackedScene = load("res://scenes/Collection.tscn")
	get_tree().change_scene_to_packed(scene)

func _on_deck_select() -> void:
	var scene: PackedScene = load("res://scenes/DeckSelect.tscn")
	get_tree().change_scene_to_packed(scene)

func _api_origin() -> String:
	var env := OS.get_environment("TAROT_API_ORIGIN")
	if env != "":
		return env
	if OS.has_feature("web"):
		var origin: String = str(JavaScriptBridge.eval("location.origin"))
		if origin != "":
			return origin
	return "http://localhost:3000"
