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
@onready var card_preview := $CardPreview

# Card scene
var card_scene := preload("res://scenes/CardView.tscn")

# Networking
@onready var http := HTTPRequest.new()
var ws_client: WebSocketPeer
var match_id := ""
var deck_name := "classic"

# PvP networking helpers
var ws_joined := false
var queue_poll_http: HTTPRequest
var queue_polling := false
var queue_poll_attempts := 0
var first_state_received := false

# Simple matchmaking overlay
var match_overlay: Control

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
	
	# Initialize match (PvP by default since we're coming from menu)
	# PvE battles are started from PvEMap with specific metadata
	if has_meta("return_to_map") and get_meta("return_to_map"):
		# This is a PvE battle from the map
		_start_pve_match()
	else:
		# Regular PvP match
		_start_pvp_match()
		_ensure_match_overlay()
		_set_overlay_text("Searching for opponent…")

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
	var env := OS.get_environment("TAROT_API_ORIGIN")
	if env != "":
		return env
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
		# Update current player id if backend returns it
		if data.match.has("playerId"):
			current_player_id = str(data.match.get("playerId"))
		# In PvE we don't use WebSocket; in PvP we join WS and wait for state
		if get_meta("game_mode", "pvp") == "pve":
			_load_initial_cards()
		else:
			_setup_websocket()
			_set_overlay_text("Match found! Connecting…")
	elif data.has("queued"):
		# Poll for match result
		await get_tree().create_timer(0.6).timeout
		_poll_match_result()

func _setup_websocket() -> void:
	ws_client = WebSocketPeer.new()
	var origin := _api_origin()
	var url := "ws://localhost:3000/api/ws"
	if origin.begins_with("https://"):
		url = origin.replace("https://", "wss://") + "/api/ws"
	elif origin.begins_with("http://"):
		url = origin.replace("http://", "ws://") + "/api/ws"
	ws_client.connect_to_url(url)
	ws_joined = false

func _poll_match_result() -> void:
	# Repeatedly poll the backend for a queued match result
	if queue_poll_http == null:
		queue_poll_http = HTTPRequest.new()
		add_child(queue_poll_http)
		queue_poll_http.request_completed.connect(_on_poll_result)
	if queue_polling:
		return
	queue_polling = true
	var url := _api_origin() + "/api/match/result?userId=" + str(current_player_id).uri_encode()
	queue_poll_http.request(url)

func _on_poll_result(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	queue_polling = false
	if code != 200:
		# Backoff and retry
		queue_poll_attempts += 1
		var delay: float = min(5.0, 0.5 * pow(1.5, queue_poll_attempts))
		await get_tree().create_timer(delay).timeout
		_poll_match_result()
		return
	var txt := body.get_string_from_utf8()
	var data = JSON.parse_string(txt)
	if data and data.has("match"):
		match_id = data.match.get("id", "")
		if data.match.has("playerId"):
			current_player_id = str(data.match.get("playerId"))
		_setup_websocket()
		_set_overlay_text("Match found! Connecting…")
	else:
		# No match yet; keep polling
		queue_poll_attempts += 1
		var delay: float = min(5.0, 0.5 * pow(1.5, queue_poll_attempts))
		await get_tree().create_timer(delay).timeout
		_poll_match_result()

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
	
	# Connect signals for player cards
	if is_player and card.has_signal("clicked"):
		card.clicked.connect(_on_card_clicked.bind(card))
	
	# Connect preview signal for all cards
	if card.has_signal("preview_requested"):
		card.preview_requested.connect(_show_card_preview.bind(card))

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
	var action := {
		"type": "play_card",
		"cardId": card.get_meta("card_id", ""),
		"from": "hand",
		"to": "board"
	}
	_send(action)

func _send(action: Dictionary) -> void:
	if not ws_client:
		return
	if ws_client.get_ready_state() != WebSocketPeer.STATE_OPEN:
		return
	if match_id != "":
		action["matchId"] = match_id
	if current_player_id != "":
		action["playerId"] = current_player_id
	ws_client.send_text(JSON.stringify(action))

func _arrange_hand(is_player: bool) -> void:
	var container := player_hand_container if is_player else opponent_hand_container
	var cards := container.get_children()
	var card_count := cards.size()
	
	if card_count == 0:
		return
	
	var start_x: float = - (card_count - 1) * HAND_CARD_SPACING / 2.0
	
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
	
	var start_x: float = - (min(card_count, MAX_BOARD_CARDS) - 1) * BOARD_CARD_SPACING / 2.0
	
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
	_send({"type": "end_turn"})
	
	# Advance phase only in PvE; PvP waits for server
	if get_meta("game_mode", "pvp") == "pve":
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
	
	if get_meta("game_mode", "pvp") == "pve":
		if is_my_turn:
			# Player's turn - gain fate
			player_fate = min(player_max_fate, player_fate + 1)
			_draw_card_to_hand(true)
		else:
			# Opponent's turn
			opponent_fate = min(3, opponent_fate + 1)
			_draw_card_to_hand(false)
			# Simulate AI turn after delay
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
			if not ws_joined and match_id != "":
				var join_payload := {
					"type": "join_match",
					"matchId": match_id,
					"playerId": current_player_id,
					"deck": deck_name
				}
				ws_client.send_text(JSON.stringify(join_payload))
				ws_joined = true
				_set_overlay_text("Joined match. Waiting for state…")
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
			if not first_state_received:
				first_state_received = true
				_hide_overlay()
		"card_played":
			_handle_opponent_card_played(data)
		"turn_ended":
			_handle_turn_ended(data)
		"game_over":
			_handle_game_over(data)

func _update_game_state(state: Dictionary) -> void:
	# Server-authoritative update; tolerate partial payloads
	if state.has("turn"):
		current_turn = int(state.get("turn"))
		_update_turn_display()
	if state.has("phase"):
		current_phase = str(state.get("phase"))
		_update_phase_display()
	if state.has("currentPlayerId"):
		var cur := str(state.get("currentPlayerId"))
		is_my_turn = (cur == current_player_id)
		end_turn_button.disabled = not is_my_turn
		_update_turn_display()
	# Health/Fate
	if state.has("players"):
		var players = state.get("players")
		if players is Dictionary:
			if players.has(current_player_id):
				var me = players[current_player_id]
				if me.has("health"):
					player_health = int(me["health"])
				if me.has("fate"):
					player_fate = int(me["fate"])
			# Find opponent
			for k in players.keys():
				if str(k) != current_player_id:
					var opp = players[k]
					if opp.has("health"):
						opponent_health = int(opp["health"])
					if opp.has("fate"):
						opponent_fate = int(opp["fate"])
					break
		_update_health_display()
		_update_fate_display()
	# Zones
	if state.has("hands"):
		var hands = state.get("hands")
		if hands is Dictionary:
			if hands.has(current_player_id):
				_rebuild_hand(true, hands[current_player_id])
			for k in hands.keys():
				if str(k) != current_player_id:
					_rebuild_hand(false, hands[k])
					break
	if state.has("boards"):
		var boards = state.get("boards")
		if boards is Dictionary:
			if boards.has(current_player_id):
				_rebuild_board(true, boards[current_player_id])
			for k in boards.keys():
				if str(k) != current_player_id:
					_rebuild_board(false, boards[k])
					break

func _handle_opponent_card_played(data: Dictionary) -> void:
	# Prefer full state from server
	if data.has("state"):
		_update_game_state(data["state"])
		return
	# Fallback: animate opponent moving one card from hand to board
	var hand_cards := opponent_hand_container.get_children()
	if hand_cards.size() > 0:
		var card := hand_cards[0]
		opponent_hand_container.remove_child(card)
		opponent_board_container.add_child(card)
		if card.has_method("set_card_back"):
			card.set_card_back(false)
		_arrange_hand(false)
		_arrange_board(false)

func _handle_turn_ended(data: Dictionary) -> void:
	if data.has("currentPlayerId"):
		is_my_turn = (str(data.get("currentPlayerId")) == current_player_id)
		end_turn_button.disabled = not is_my_turn
	if data.has("turn"):
		current_turn = int(data.get("turn"))
	if data.has("phase"):
		current_phase = str(data.get("phase"))
		_update_phase_display()
	_update_turn_display()


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

func _show_card_preview(card: Node) -> void:
	if not card_preview:
		return
	
	# Don't show preview for face-down cards
	if card.is_face_down:
		return
	
	# Show preview overlay
	card_preview.visible = true
	
	# Update preview content
	var preview_image := card_preview.get_node_or_null("Panel/VBox/CardImage")
	var preview_name := card_preview.get_node_or_null("Panel/VBox/CardName")
	var preview_desc := card_preview.get_node_or_null("Panel/VBox/Description")
	var close_button := card_preview.get_node_or_null("Panel/VBox/CloseButton")
	
	if preview_name:
		preview_name.text = card.get_meta("card_name", "Unknown Card")
	
	if preview_desc:
		preview_desc.text = "Cost: " + str(card.get_meta("cost", 1)) + "\n\n"
		preview_desc.text += "This is a placeholder description for the card.\n"
		preview_desc.text += "Click outside to close."
	
	if close_button and not close_button.pressed.is_connected(_hide_card_preview):
		close_button.pressed.connect(_hide_card_preview)

func _hide_card_preview() -> void:
	if card_preview:
		card_preview.visible = false

func _input(event: InputEvent) -> void:
	# Hide preview on any click outside
	if event is InputEventMouseButton and event.pressed:
		if card_preview and card_preview.visible:
			var panel := card_preview.get_node_or_null("Panel")
			if panel:
				var local_pos: Vector2 = panel.get_local_mouse_position()
				var rect := Rect2(Vector2.ZERO, panel.size)
				if not rect.has_point(local_pos):
					_hide_card_preview()

func _return_to_pve_map(won: bool) -> void:
	# Clean up connections
	if ws_client:
		ws_client.close()
		ws_client = null
	
	# Prepare rewards if won
	var rewards := {}
	if won:
		rewards["gold"] = randi_range(30, 60)
		rewards["cards"] = ["wands_03"] # Example reward
	
	# Return to PvE map
	var map_scene := load("res://scenes/PvEMap.tscn")
	var instance: Node = map_scene.instantiate()
	
	# Pass battle result back to map
	instance.call_deferred("_on_return_from_battle", won, rewards)
	
	get_tree().root.add_child(instance)
	queue_free()

# Helpers to rebuild zones from server-provided arrays of card ids
func _rebuild_hand(is_player: bool, ids: Variant) -> void:
	var container := player_hand_container if is_player else opponent_hand_container
	# Clear
	for child in container.get_children():
		child.queue_free()
	if not (ids is Array):
		_arrange_hand(is_player)
		return
	for id in ids:
		var card := card_scene.instantiate()
		container.add_child(card)
		card.set_meta("zone", "player_hand" if is_player else "opponent_hand")
		if is_player:
			if card.has_signal("clicked"):
				card.clicked.connect(_on_card_clicked.bind(card))
			if card.has_method("load_card_image"):
				card.load_card_image(str(id), deck_name)
		else:
			# Opponent hand stays hidden
			if card.has_method("set_card_back"):
				card.set_card_back(true)
	_arrange_hand(is_player)

func _rebuild_board(is_player: bool, ids: Variant) -> void:
	var container := player_board_container if is_player else opponent_board_container
	for child in container.get_children():
		child.queue_free()
	if not (ids is Array):
		_arrange_board(is_player)
		return
	for id in ids:
		var card := card_scene.instantiate()
		container.add_child(card)
		card.set_meta("zone", "player_board" if is_player else "opponent_board")
		if is_player:
			if card.has_method("load_card_image"):
				card.load_card_image(str(id), deck_name)
		else:
			if card.has_method("set_card_back"):
				card.set_card_back(false)
			if card.has_method("load_card_image"):
				card.load_card_image(str(id), deck_name)
	_arrange_board(is_player)

# Minimal matchmaking overlay shown during queueing and connect
func _ensure_match_overlay() -> void:
	if match_overlay:
		return
	var overlay := Control.new()
	overlay.name = "MatchOverlay"
	overlay.anchor_left = 0
	overlay.anchor_top = 0
	overlay.anchor_right = 1
	overlay.anchor_bottom = 1
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var panel := Panel.new()
	panel.name = "Panel"
	panel.custom_minimum_size = Vector2(420, 120)
	panel.anchor_left = 0.5
	panel.anchor_top = 0.1
	panel.anchor_right = 0.5
	panel.anchor_bottom = 0.1
	panel.offset_left = -210
	panel.offset_top = 0
	panel.offset_right = 210
	panel.offset_bottom = 120
	var label := Label.new()
	label.name = "Label"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.anchor_left = 0
	label.anchor_top = 0
	label.anchor_right = 1
	label.anchor_bottom = 1
	label.text = ""
	panel.add_child(label)
	overlay.add_child(panel)
	add_child(overlay)
	match_overlay = overlay

func _set_overlay_text(text: String) -> void:
	_ensure_match_overlay()
	if not match_overlay:
		return
	match_overlay.visible = true
	var label := match_overlay.get_node_or_null("Panel/Label") as Label
	if label:
		label.text = text

func _hide_overlay() -> void:
	if match_overlay:
		match_overlay.visible = false