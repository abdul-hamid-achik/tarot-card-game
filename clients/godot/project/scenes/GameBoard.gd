extends Control

# Game state
var current_player_id := "player"
var opponent_id := "opponent"
var current_turn := 0
var current_phase := "main"
var is_my_turn := true

# Resources
var player_health := 20
var player_max_health := 20
var player_fate := 1
var player_max_fate := 3
var opponent_health := 20
var opponent_max_health := 20
var opponent_fate := 1

# Card zones
@onready var player_hand_container := $BoardLayout/PlayerArea/HandContainer
@onready var player_board_container := $BoardLayout/CenterArea/PlayerBoard
@onready var opponent_board_container := $BoardLayout/CenterArea/OpponentBoard
@onready var opponent_hand_container := $BoardLayout/OpponentArea/HandContainer

# UI Elements
@onready var player_health_label := $BoardLayout/PlayerArea/PlayerInfo/HealthLabel
@onready var player_fate_label := $BoardLayout/PlayerArea/PlayerInfo/FateLabel
@onready var opponent_health_label := $BoardLayout/OpponentArea/OpponentInfo/HealthLabel
@onready var opponent_fate_label := $BoardLayout/OpponentArea/OpponentInfo/FateLabel
@onready var phase_label := $BoardLayout/CenterArea/PhaseIndicator/PhaseLabel
@onready var turn_label := $BoardLayout/CenterArea/TurnIndicator/TurnLabel
@onready var end_turn_button := $BoardLayout/PlayerArea/EndTurnButton

# Deck visuals
@onready var player_deck := $BoardLayout/PlayerArea/DeckZone/Deck
@onready var player_discard := $BoardLayout/PlayerArea/DeckZone/Discard
@onready var opponent_deck := $BoardLayout/OpponentArea/DeckZone/Deck
@onready var opponent_discard := $BoardLayout/OpponentArea/DeckZone/Discard

# Menu and settings
@onready var menu_button := $TopBar/MenuButton
@onready var settings_button := $TopBar/SettingsButton
@onready var confirmation_dialog := $ConfirmationDialog
@onready var settings_panel := $SettingsPanel

# Card scene
var card_scene := preload("res://scenes/CardView.tscn")

# Networking
@onready var http := HTTPRequest.new()
var ws_client: WebSocketPeer
var match_id := ""
var deck_name := "classic"

# Card positioning
const HAND_CARD_SPACING := 120
const BOARD_CARD_SPACING := 140
const MAX_HAND_CARDS := 7
const MAX_BOARD_CARDS := 5

func _ready() -> void:
	add_child(http)
	_setup_ui()
	_connect_signals()
	_initialize_game_state()
	
	# Load background
	_load_table_background()
	
	# Initialize match (PvP or PvE based on global state)
	if get_meta("game_mode", "pvp") == "pvp":
		_start_pvp_match()
	else:
		_start_pve_match()

func _setup_ui() -> void:
	# Set initial UI values
	_update_health_display()
	_update_fate_display()
	_update_phase_display()
	_update_turn_display()
	
	# Setup deck visuals
	player_deck.modulate = Color(0.7, 0.7, 1.0)
	opponent_deck.modulate = Color(1.0, 0.7, 0.7)

func _connect_signals() -> void:
	end_turn_button.pressed.connect(_on_end_turn_pressed)
	http.request_completed.connect(_on_http_response)
	menu_button.pressed.connect(_on_menu_button_pressed)
	settings_button.pressed.connect(_on_settings_button_pressed)
	confirmation_dialog.confirmed.connect(_on_menu_confirmed)
	confirmation_dialog.canceled.connect(_on_menu_canceled)

func _initialize_game_state() -> void:
	current_turn = 1
	current_phase = "draw"
	player_fate = 1
	opponent_fate = 1

func _api_origin() -> String:
	if OS.has_feature("web"):
		var origin: String = str(JavaScriptBridge.eval("location.origin"))
		if origin != "":
			return origin
	return "http://localhost:3000"

func _load_table_background() -> void:
	var bg_req := HTTPRequest.new()
	add_child(bg_req)
	bg_req.request_completed.connect(_on_background_loaded)
	bg_req.request(_api_origin() + "/api/ui/themes/pixel-pack/backgrounds/table_bg_04.png")

func _on_background_loaded(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if code != 200:
		return
	var img := Image.new()
	if img.load_png_from_buffer(body) != OK:
		return
	var tex := ImageTexture.create_from_image(img)
	var bg := TextureRect.new()
	bg.texture = tex
	bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	bg.anchor_right = 1.0
	bg.anchor_bottom = 1.0
	add_child(bg)
	move_child(bg, 0)

func _start_pvp_match() -> void:
	# Queue for match
	http.request(
		_api_origin() + "/api/match/queue",
		["Content-Type: application/json"],
		HTTPClient.METHOD_POST,
		JSON.stringify({"userId": current_player_id})
	)

func _start_pve_match() -> void:
	# Start headless match against AI
	http.request(
		_api_origin() + "/api/match/start",
		["Content-Type: application/json"],
		HTTPClient.METHOD_POST,
		JSON.stringify({
			"seed": "pve-" + str(Time.get_unix_time_from_system()),
			"players": [current_player_id, "ai_opponent"]
		})
	)

func _on_http_response(_result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code != 200:
		print("HTTP request failed: ", response_code)
		return
	
	var json_str := body.get_string_from_utf8()
	var data = JSON.parse_string(json_str)
	
	if data.has("match"):
		match_id = data.match.get("id", "")
		_setup_websocket()
		_load_initial_cards()
	elif data.has("queued"):
		# Poll for match result
		await get_tree().create_timer(1.0).timeout
		_poll_match_result()

func _setup_websocket() -> void:
	ws_client = WebSocketPeer.new()
	var url := "ws://localhost:3000/api/ws"
	if OS.has_feature("web"):
		url = "ws://" + JavaScriptBridge.eval("location.host") + "/api/ws"
	ws_client.connect_to_url(url)

func _poll_match_result() -> void:
	# Implementation for polling match results
	pass

func _load_initial_cards() -> void:
	# Draw initial hand for player
	for i in range(4):
		_draw_card_to_hand(true)
	
	# Show opponent cards (face down)
	for i in range(4):
		_draw_card_to_hand(false)

func _draw_card_to_hand(is_player: bool) -> void:
	var card := card_scene.instantiate()
	
	if is_player:
		player_hand_container.add_child(card)
		card.set_meta("zone", "player_hand")
		# Load random card for demo
		card.load_card_image("major_0" + str(randi() % 10), deck_name)
	else:
		opponent_hand_container.add_child(card)
		card.set_meta("zone", "opponent_hand")
		card.set_card_back(true)
	
	_arrange_hand(is_player)
	
	# Connect drag signals for player cards
	if is_player and card.has_signal("clicked"):
		card.clicked.connect(_on_card_clicked.bind(card))

func _on_card_clicked(card: Node) -> void:
	var zone = card.get_meta("zone", "")
	
	if zone == "player_hand" and is_my_turn:
		if player_fate >= _get_card_cost(card):
			_play_card_from_hand(card)

func _get_card_cost(card: Node) -> int:
	# Get cost from card data
	return card.get_meta("cost", 1)

func _play_card_from_hand(card: Node) -> void:
	# Move from hand to board
	player_hand_container.remove_child(card)
	player_board_container.add_child(card)
	card.set_meta("zone", "player_board")
	
	# Deduct fate cost
	player_fate -= _get_card_cost(card)
	_update_fate_display()
	
	# Rearrange zones
	_arrange_hand(true)
	_arrange_board(true)
	
	# Send to server
	_send_play_card_action(card)

func _send_play_card_action(card: Node) -> void:
	if ws_client and ws_client.get_ready_state() == WebSocketPeer.STATE_OPEN:
		var action := {
			"type": "play_card",
			"card_id": card.get_meta("card_id", ""),
			"from": "hand",
			"to": "board"
		}
		ws_client.send_text(JSON.stringify(action))

func _arrange_hand(is_player: bool) -> void:
	var container := player_hand_container if is_player else opponent_hand_container
	var cards := container.get_children()
	var card_count := cards.size()
	
	if card_count == 0:
		return
	
	var start_x: float = -(card_count - 1) * HAND_CARD_SPACING / 2.0
	
	for i in range(card_count):
		var card := cards[i]
		var target_pos := Vector2(start_x + i * HAND_CARD_SPACING, 0)
		
		# Animate to position
		var tween := create_tween()
		tween.set_trans(Tween.TRANS_CUBIC)
		tween.set_ease(Tween.EASE_OUT)
		tween.tween_property(card, "position", target_pos, 0.3)
		
		# Fan cards slightly
		if is_player:
			var rotation := (i - card_count / 2.0) * 0.05
			tween.parallel().tween_property(card, "rotation", rotation, 0.3)

func _arrange_board(is_player: bool) -> void:
	var container := player_board_container if is_player else opponent_board_container
	var cards := container.get_children()
	var card_count := cards.size()
	
	if card_count == 0:
		return
	
	var start_x: float = -(min(card_count, MAX_BOARD_CARDS) - 1) * BOARD_CARD_SPACING / 2.0
	
	for i in range(min(card_count, MAX_BOARD_CARDS)):
		var card := cards[i]
		var target_pos := Vector2(start_x + i * BOARD_CARD_SPACING, 0)
		
		var tween := create_tween()
		tween.set_trans(Tween.TRANS_CUBIC)
		tween.set_ease(Tween.EASE_OUT)
		tween.tween_property(card, "position", target_pos, 0.3)
		tween.parallel().tween_property(card, "rotation", 0, 0.3)

func _on_end_turn_pressed() -> void:
	if not is_my_turn:
		return
	
	is_my_turn = false
	end_turn_button.disabled = true
	
	# Send end turn to server
	if ws_client and ws_client.get_ready_state() == WebSocketPeer.STATE_OPEN:
		ws_client.send_text(JSON.stringify({"type": "end_turn"}))
	
	# Advance phase
	_advance_phase()

func _advance_phase() -> void:
	match current_phase:
		"draw":
			current_phase = "main"
		"main":
			current_phase = "combat"
		"combat":
			current_phase = "end"
		"end":
			current_phase = "draw"
			current_turn += 1
			_switch_turn()
	
	_update_phase_display()
	_update_turn_display()

func _switch_turn() -> void:
	is_my_turn = not is_my_turn
	end_turn_button.disabled = not is_my_turn
	
	if is_my_turn:
		# Player's turn - gain fate
		player_fate = min(player_max_fate, player_fate + 1)
		_draw_card_to_hand(true)
	else:
		# Opponent's turn
		opponent_fate = min(3, opponent_fate + 1)
		_draw_card_to_hand(false)
		# Simulate AI turn after delay
		if get_meta("game_mode", "pvp") == "pve":
			await get_tree().create_timer(2.0).timeout
			_simulate_ai_turn()
	
	_update_fate_display()

func _simulate_ai_turn() -> void:
	# Simple AI logic for PvE
	await get_tree().create_timer(1.0).timeout
	
	# AI plays a card
	var hand_cards := opponent_hand_container.get_children()
	if hand_cards.size() > 0 and opponent_fate > 0:
		var card := hand_cards[0]
		opponent_hand_container.remove_child(card)
		opponent_board_container.add_child(card)
		card.set_card_back(false)
		card.load_card_image("major_" + str(randi() % 22).pad_zeros(2), deck_name)
		opponent_fate -= 1
		_update_fate_display()
		_arrange_hand(false)
		_arrange_board(false)
	
	await get_tree().create_timer(1.0).timeout
	_advance_phase()

func _update_health_display() -> void:
	player_health_label.text = str(player_health) + "/" + str(player_max_health)
	opponent_health_label.text = str(opponent_health) + "/" + str(opponent_max_health)

func _update_fate_display() -> void:
	player_fate_label.text = "Fate: " + str(player_fate) + "/" + str(player_max_fate)
	opponent_fate_label.text = "Fate: " + str(opponent_fate) + "/3"

func _update_phase_display() -> void:
	phase_label.text = current_phase.capitalize()

func _update_turn_display() -> void:
	turn_label.text = "Turn " + str(current_turn)
	if is_my_turn:
		turn_label.modulate = Color.GREEN
	else:
		turn_label.modulate = Color.RED

func _process(_delta: float) -> void:
	if ws_client:
		ws_client.poll()
		
		var state := ws_client.get_ready_state()
		if state == WebSocketPeer.STATE_OPEN:
			while ws_client.get_available_packet_count():
				var packet := ws_client.get_packet().get_string_from_utf8()
				_handle_websocket_message(packet)

func _handle_websocket_message(message: String) -> void:
	var data = JSON.parse_string(message)
	if not data:
		return
	
	match data.get("type", ""):
		"game_state":
			_update_game_state(data.state)
		"card_played":
			_handle_opponent_card_played(data)
		"turn_ended":
			_handle_turn_ended(data)
		"game_over":
			_handle_game_over(data)

func _update_game_state(state: Dictionary) -> void:
	# Update game state from server
	pass

func _handle_opponent_card_played(data: Dictionary) -> void:
	# Handle opponent playing a card
	pass

func _handle_turn_ended(data: Dictionary) -> void:
	# Handle turn end from server
	pass

func _handle_game_over(data: Dictionary) -> void:
	# Handle game over
	var winner: String = data.get("winner", "")
	print("Game Over! Winner: ", winner)
	
	# If this is a PvE battle, return to map
	if get_meta("return_to_map", false):
		_return_to_pve_map(winner == current_player_id)

func _on_menu_button_pressed() -> void:
	# Show confirmation dialog
	confirmation_dialog.dialog_text = "Are you sure you want to quit to menu? Current game progress will be lost."
	confirmation_dialog.popup_centered()

func _on_settings_button_pressed() -> void:
	# Toggle settings panel
	settings_panel.visible = not settings_panel.visible
	if settings_panel.visible:
		settings_panel.popup_centered()

func _on_menu_confirmed() -> void:
	# Clean up network connections
	if ws_client:
		ws_client.close()
		ws_client = null
	
	# Return to menu
	var menu_scene := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu_scene)

func _on_menu_canceled() -> void:
	# Just close the dialog
	pass

func _exit_tree() -> void:
	# Clean up when scene is removed
	if ws_client:
		ws_client.close()
		ws_client = null

func _return_to_pve_map(won: bool) -> void:
	# Clean up connections
	if ws_client:
		ws_client.close()
		ws_client = null
	
	# Prepare rewards if won
	var rewards := {}
	if won:
		rewards["gold"] = randi_range(30, 60)
		rewards["cards"] = ["wands_03"]  # Example reward
	
	# Return to PvE map
	var map_scene := load("res://scenes/PvEMap.tscn")
	var instance: Node = map_scene.instantiate()
	
	# Pass battle result back to map
	instance.call_deferred("_on_return_from_battle", won, rewards)
	
	get_tree().root.add_child(instance)
	queue_free()