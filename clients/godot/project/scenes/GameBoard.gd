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

# Tarot Mechanics
var spread_bonuses := {}
var arcana_trials := {"sun": 0, "moon": 0, "judgement": 0}
var major_arcana_charge := 0
var major_arcana_max_charge := 100
var fate_generation_per_turn := 1
var card_orientations := {} # card_id -> "upright" or "reversed"
var mulligan_cards := []  # Cards for opening reading
var channeling_card := null  # Currently channeling card
var channeling_turns := 0
var suit_styles := {
	"wands": {"style": "aggressive", "effect": "burn", "damage_bonus": 2},
	"cups": {"style": "defensive", "effect": "heal", "heal_amount": 2},
	"swords": {"style": "precise", "effect": "counter", "counter_damage": 1},
	"pentacles": {"style": "slow", "effect": "inevitable", "shield": 1}
}

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
@onready var turn_timer_label := $TopBar/TurnTimer
@onready var end_turn_button := $BoardLayout/PlayerArea/EndTurnButton
@onready var hand_toggle_button := $BoardLayout/PlayerArea/HandToggleButton

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
var ws_url := ""

# PvP networking helpers
var ws_joined := false
var queue_poll_http: HTTPRequest
var queue_polling := false
var queue_poll_attempts := 0
var first_state_received := false

# Simple matchmaking overlay
var match_overlay: Control
var cancel_queue_button: Button
var connection_overlay: Control
var connection_status: Label
var connection_retry_button: Button
var reaction_overlay: Control
var reaction_label: Label
var target_lines_node: Node2D
var damage_previews_node: Node2D
var target_valid := true
var last_validated_idx := -1
var last_validation_cooldown := 0.0

# Card positioning
const HAND_CARD_SPACING := 120
const BOARD_CARD_SPACING := 140
const MAX_HAND_CARDS := 7
const MAX_BOARD_CARDS := 5

# Turn timer
const TURN_TIME_SECONDS := 75
const TURN_TIMER_WARN_AT := 30
var turn_time_left := TURN_TIME_SECONDS
var turn_timer := Timer.new()

# Reconnect handling
var reconnect_attempts := 0
var reconnect_timer := Timer.new()
var is_reconnecting := false
const MAX_RECONNECT_ATTEMPTS := 6

# Reaction window (stub)
var reaction_window_open := false
var reaction_timer := Timer.new()
var reaction_time_left := 0
var reaction_desc := ""

func _ready() -> void:
	add_child(http)
	add_child(turn_timer)
	turn_timer.one_shot = false
	turn_timer.wait_time = 1.0
	if not turn_timer.timeout.is_connected(_on_turn_tick):
		turn_timer.timeout.connect(_on_turn_tick)
	# Reconnect timer
	add_child(reconnect_timer)
	reconnect_timer.one_shot = true
	if not reconnect_timer.timeout.is_connected(_attempt_reconnect):
		reconnect_timer.timeout.connect(_attempt_reconnect)
	# Reaction timer
	add_child(reaction_timer)
	reaction_timer.one_shot = false
	reaction_timer.wait_time = 0.2
	if not reaction_timer.timeout.is_connected(_on_reaction_tick):
		reaction_timer.timeout.connect(_on_reaction_tick)
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
		# Regular PvP match; honor selected deck
		var conf_deck := ProjectSettings.get_setting("tarot/player_deck", "")
		if str(conf_deck) != "":
			deck_name = str(conf_deck)
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
	# Draw attack lanes
	var lanes := get_node_or_null("BoardLayout/CenterArea/AttackLanes") as Node2D
	if lanes:
		var y1 := 0.2
		var y2 := 0.8
		for i in range(6):
			var line := Line2D.new()
			var x := 0.2 + i * (0.6 / 5.0)
			line.default_color = Color(0.2, 0.4, 0.9, 0.3)
			line.width = 2
			# Convert normalized coords to rect
			var rect := get_viewport_rect()
			line.add_point(Vector2(rect.size.x * x, rect.size.y * (0.3 + y1 * 0.4)))
			line.add_point(Vector2(rect.size.x * x, rect.size.y * (0.3 + y2 * 0.4)))
			lanes.add_child(line)
	# Cache effect layers
	target_lines_node = get_node_or_null("BoardLayout/CenterArea/TargetLines") as Node2D
	damage_previews_node = get_node_or_null("BoardLayout/CenterArea/DamagePreviews") as Node2D

func _connect_signals() -> void:
	end_turn_button.pressed.connect(_on_end_turn_pressed)
	hand_toggle_button.pressed.connect(_on_hand_toggle_pressed)
	http.request_completed.connect(_on_http_response)
	menu_button.pressed.connect(_on_menu_button_pressed)
	settings_button.pressed.connect(_on_settings_button_pressed)
	confirmation_dialog.confirmed.connect(_on_menu_confirmed)
	confirmation_dialog.canceled.connect(_on_menu_canceled)
	# Fate action buttons
	if flip_button:
		flip_button.pressed.connect(_on_flip_pressed)
	if peek_button:
		peek_button.pressed.connect(_on_peek_pressed)
	if force_draw_button:
		force_draw_button.pressed.connect(_on_force_draw_pressed)
	if block_flip_button:
		block_flip_button.pressed.connect(_on_block_flip_pressed)
	if divine_button:
		divine_button.pressed.connect(_on_divine_pressed)

func _initialize_game_state() -> void:
	current_turn = 1
	current_phase = "mulligan"  # Start with mulligan phase
	player_fate = 1
	opponent_fate = 1
	_reset_turn_timer()
	_show_opening_reading()

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
		# Fallback: run a local PvE demo so the board is interactive even without the backend
		if get_meta("game_mode", "pvp") == "pvp":
			set_meta("game_mode", "pve")
			_load_initial_cards()
			_hide_overlay()
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
	ws_url = url
	ws_client.connect_to_url(url)
	ws_joined = false
	reconnect_attempts = 0
	is_reconnecting = false

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
	# Now handled by _draw_initial_hands after mulligan
	if current_phase != "mulligan":
		_draw_initial_hands()

func _draw_card_to_hand(is_player: bool) -> void:
	var card := card_scene.instantiate()
	
	# Start from deck position for animation
	var deck_pos := player_deck.global_position if is_player else opponent_deck.global_position
	
	if is_player:
		player_hand_container.add_child(card)
		card.set_meta("zone", "player_hand")
		# Load random card for demo
		card.load_card_image("major_0" + str(randi() % 10), deck_name)
	else:
		opponent_hand_container.add_child(card)
		card.set_meta("zone", "opponent_hand")
		card.set_card_back(true)
	
	# Animate from deck to hand (0.3s draw animation as per diagram)
	card.global_position = deck_pos
	card.scale = Vector2(0.1, 0.1)
	card.modulate.a = 0.0
	
	var tween := create_tween()
	tween.set_parallel()
	tween.tween_property(card, "scale", Vector2(0.5, 0.5), 0.3)  # Scale to hand size
	tween.tween_property(card, "modulate:a", 1.0, 0.3)
	
	# Then arrange hand
	await tween.finished
	_arrange_hand(is_player)
	
	# Connect signals for player cards
	if is_player and card.has_signal("clicked"):
		card.clicked.connect(_on_card_clicked.bind(card))
	# Allow drag-to-drop onto board
	if is_player and card.has_signal("drag_ended"):
		card.drag_ended.connect(_on_card_drag_ended.bind(card))
	if is_player and card.has_signal("drag_moved"):
		card.drag_moved.connect(_on_card_drag_moved.bind(card))
	
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
	var base_cost := card.get_meta("cost", 1)
	# Apply spread bonuses
	if spread_bonuses.has("present_cost_reduction") and current_turn == 1:
		base_cost = max(0, base_cost - 1)
	return base_cost

func _flip_card_orientation(card: Node) -> void:
	var card_id := card.get_meta("card_id", "")
	if card_id == "":
		return
	if player_fate < 1:
		return
	player_fate -= 1
	var current := card_orientations.get(card_id, "upright")
	card_orientations[card_id] = "reversed" if current == "upright" else "upright"
	_update_fate_display()
	# Visual feedback
	var tween := create_tween()
	tween.tween_property(card, "rotation", PI if card_orientations[card_id] == "reversed" else 0, 0.3)
	# Send to server
	_send({"type": "flip_orientation", "cardId": card_id})

func _process_spread_bonuses(is_player: bool) -> void:
	# Past card: Fate refund on turns 1-2
	if spread_bonuses.has("past_fate_refund") and current_turn <= 2:
		if is_player:
			player_fate = min(player_max_fate, player_fate + 1)
			_update_fate_display()
	
	# Future card: Extra draw
	if spread_bonuses.has("future_draw_bonus") and current_turn == 2:
		if is_player:
			_draw_card_to_hand(true)

func _check_trials_progress() -> void:
	# Check for trial completions
	var completed := 0
	for trial in arcana_trials:
		if arcana_trials[trial] >= 100:
			completed += 1
	if completed >= 3:
		_trigger_victory("trials")

func _trigger_victory(type: String) -> void:
	if type == "trials":
		print("Victory by completing 3 Arcana Trials!")
		_handle_game_over({"winner": current_player_id, "type": "trials"})

func _show_opening_reading() -> void:
	# Mulligan: Three-card spread for opening hand
	var mulligan_panel := Panel.new()
	mulligan_panel.name = "MulliganPanel"
	mulligan_panel.anchor_left = 0.2
	mulligan_panel.anchor_right = 0.8
	mulligan_panel.anchor_top = 0.3
	mulligan_panel.anchor_bottom = 0.7
	add_child(mulligan_panel)
	
	var title := Label.new()
	title.text = "Opening Reading - Choose Your Fate"
	title.anchor_right = 1.0
	title.anchor_bottom = 0.1
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mulligan_panel.add_child(title)
	
	var spread_container := HBoxContainer.new()
	spread_container.anchor_left = 0.1
	spread_container.anchor_right = 0.9
	spread_container.anchor_top = 0.2
	spread_container.anchor_bottom = 0.7
	spread_container.alignment = BoxContainer.ALIGNMENT_CENTER
	mulligan_panel.add_child(spread_container)
	
	# Draw 3 cards for Past, Present, Future
	for i in range(3):
		var card := card_scene.instantiate()
		spread_container.add_child(card)
		card.load_card_image("major_%02d" % randi_range(0, 21), deck_name)
		
		var label := Label.new()
		match i:
			0: 
				label.text = "Past\n(Fate refund T1-2)"
				card.set_meta("spread_position", "past")
			1: 
				label.text = "Present\n(Cost -1 on T1)"
				card.set_meta("spread_position", "present")
			2: 
				label.text = "Future\n(Draw next turn)"
				card.set_meta("spread_position", "future")
		label.anchor_top = 1.0
		label.anchor_bottom = 1.2
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		card.add_child(label)
		
		card.gui_input.connect(_on_mulligan_card_selected.bind(card, i))
		mulligan_cards.append(card)
	
	var keep_button := Button.new()
	keep_button.text = "Keep This Reading"
	keep_button.anchor_left = 0.4
	keep_button.anchor_right = 0.6
	keep_button.anchor_top = 0.85
	keep_button.anchor_bottom = 0.95
	mulligan_panel.add_child(keep_button)
	keep_button.pressed.connect(_accept_mulligan)

func _on_mulligan_card_selected(event: InputEvent, card: Node, index: int) -> void:
	if event is InputEventMouseButton and event.pressed:
		# Highlight selected card
		for c in mulligan_cards:
			c.modulate = Color.WHITE
		card.modulate = Color(1.2, 1.2, 0.8)

func _accept_mulligan() -> void:
	# Apply spread bonuses based on selections
	for card in mulligan_cards:
		var pos := card.get_meta("spread_position", "")
		match pos:
			"past":
				spread_bonuses["past_fate_refund"] = true
				if past_slot:
					card.reparent(past_slot)
			"present":
				spread_bonuses["present_cost_reduction"] = true
				if present_slot:
					card.reparent(present_slot)
			"future":
				spread_bonuses["future_draw_bonus"] = true
				if future_slot:
					card.reparent(future_slot)
	
	# Remove mulligan panel
	get_node("MulliganPanel").queue_free()
	
	# Start normal game
	current_phase = "draw"
	_update_phase_display()
	_draw_initial_hands()

func _draw_initial_hands() -> void:
	# Draw starting hands after mulligan
	for i in range(4):
		_draw_card_to_hand(true)
	for i in range(4):
		_draw_card_to_hand(false)

func _charge_major_arcana(amount: int) -> void:
	major_arcana_charge = min(major_arcana_max_charge, major_arcana_charge + amount)
	_update_major_arcana_display()
	
	if major_arcana_charge >= major_arcana_max_charge:
		_enable_major_arcana_ultimate()

func _update_major_arcana_display() -> void:
	var charge_bar := get_node_or_null("BoardLayout/MajorArcanaCharge")
	if charge_bar and charge_bar is ProgressBar:
		charge_bar.value = (major_arcana_charge / float(major_arcana_max_charge)) * 100.0

func _enable_major_arcana_ultimate() -> void:
	# Enable ultimate ability based on significator
	var ultimate_button := get_node_or_null("BoardLayout/UltimateButton")
	if ultimate_button:
		ultimate_button.disabled = false
		ultimate_button.text = "Unleash Major Arcana!"
		if not ultimate_button.pressed.is_connected(_activate_major_arcana):
			ultimate_button.pressed.connect(_activate_major_arcana)

func _activate_major_arcana() -> void:
	# Activate based on current significator
	var sig := current_run.get("significator", "major_00")
	
	match sig:
		"major_00":  # The Fool
			# Chaos - randomize all hands
			_randomize_all_hands()
		"major_01":  # The Magician
			# Manifest any card
			_manifest_card()
		"major_13":  # Death
			# Transform all units
			_transform_all_units()
		"major_16":  # The Tower
			# Destroy everything
			_destroy_all_board()
		"major_21":  # The World
			# Complete a trial instantly
			arcana_trials["sun"] = 100
			_check_trials_progress()
		_:
			# Default: Deal 5 damage to all enemies
			for unit in opponent_board_container.get_children():
				unit.set_meta("health", unit.get_meta("health", 3) - 5)
				if unit.get_meta("health", 0) <= 0:
					unit.queue_free()
	
	major_arcana_charge = 0
	_update_major_arcana_display()

func _apply_suit_style(card: Node) -> void:
	var card_id := card.get_meta("card_id", "")
	
	if card_id.begins_with("wands_"):
		# Aggressive style
		card.set_meta("attack", card.get_meta("attack", 1) + 2)
	elif card_id.begins_with("cups_"):
		# Defensive/Heal style
		player_health = min(player_max_health, player_health + 2)
		_update_health_display()
	elif card_id.begins_with("swords_"):
		# Precise/Counter style
		card.set_meta("counter", true)
	elif card_id.begins_with("pentacles_"):
		# Slow/Inevitable style
		card.set_meta("shield", 1)
		card.set_meta("attack", card.get_meta("attack", 1) + 1)

func _randomize_all_hands() -> void:
	# The Fool ultimate
	var all_cards := player_hand_container.get_children() + opponent_hand_container.get_children()
	all_cards.shuffle()
	
	for card in all_cards:
		if randf() > 0.5:
			card.reparent(player_hand_container)
		else:
			card.reparent(opponent_hand_container)
	
	_arrange_hand(true)
	_arrange_hand(false)

func _manifest_card() -> void:
	# The Magician ultimate - create any card
	var card := card_scene.instantiate()
	player_hand_container.add_child(card)
	card.load_card_image("major_%02d" % randi_range(0, 21), deck_name)
	card.set_meta("zone", "player_hand")
	_arrange_hand(true)

func _transform_all_units() -> void:
	# Death ultimate - transform all units
	for unit in player_board_container.get_children() + opponent_board_container.get_children():
		var new_id := "major_%02d" % randi_range(0, 21)
		if unit.has_method("load_card_image"):
			unit.load_card_image(new_id, deck_name)
		unit.set_meta("card_id", new_id)
		unit.set_meta("attack", randi_range(1, 5))
		unit.set_meta("health", randi_range(1, 5))

func _destroy_all_board() -> void:
	# The Tower ultimate - destroy everything
	for unit in player_board_container.get_children() + opponent_board_container.get_children():
		unit.queue_free()
	
	# Deal 5 damage to both players
	player_health -= 5
	opponent_health -= 5
	_update_health_display()
	_check_victory_conditions()

func _play_card_from_hand(card: Node) -> void:
	# Store original position for animation
	var start_pos := card.global_position
	
	# Move from hand to board
	player_hand_container.remove_child(card)
	player_board_container.add_child(card)
	card.set_meta("zone", "player_board")
	
	# Play animation (0.4s + VFX as per diagram)
	card.global_position = start_pos
	
	# Create VFX
	var vfx := CPUParticles2D.new()
	vfx.position = card.position
	vfx.amount = 20
	vfx.lifetime = 0.4
	vfx.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	vfx.initial_velocity_min = 50
	vfx.initial_velocity_max = 150
	vfx.scale_amount_min = 0.5
	vfx.scale_amount_max = 1.5
	vfx.color = Color(0.8, 0.6, 1.0)
	vfx.emitting = true
	player_board_container.add_child(vfx)
	
	# Animate card to board position
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_BACK)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_property(card, "scale", Vector2(1.2, 1.2), 0.2)
	tween.tween_property(card, "scale", Vector2(1.0, 1.0), 0.2)
	
	# Clean up VFX after animation
	await tween.finished
	vfx.queue_free()
	
	# Deduct fate cost
	player_fate -= _get_card_cost(card)
	_update_fate_display()
	
	# Apply suit combat style
	_apply_suit_style(card)
	
	# Charge Major Arcana
	_charge_major_arcana(10)
	
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
	if not _validate_action(action):
		return
	if match_id != "":
		action["matchId"] = match_id
	if current_player_id != "":
		action["playerId"] = current_player_id
	ws_client.send_text(JSON.stringify(action))

func _validate_action(action: Dictionary) -> bool:
	# Basic client-side guardrails. Extend with real validations.
	var t := str(action.get("type", ""))
	match t:
		"play_card":
			return action.has("cardId")
		"end_turn":
			return is_my_turn
		_:
			return true

func _arrange_hand(is_player: bool) -> void:
	var container := player_hand_container if is_player else opponent_hand_container
	var cards := container.get_children()
	var card_count := cards.size()
	
	if card_count == 0:
		return
	
	# Proper fanning: 50px spacing, 5° angles as per diagram
	const FAN_SPACING := 50.0  # 50px spacing
	const FAN_ANGLE := deg_to_rad(5.0)  # 5° rotation per card
	var start_x: float = - (card_count - 1) * FAN_SPACING / 2.0
	
	for i in range(card_count):
		var card := cards[i]
		var target_pos := Vector2(start_x + i * FAN_SPACING, 0)
		
		# Calculate fan curve (slight arc)
		var center_offset := (i - (card_count - 1) / 2.0)
		target_pos.y = abs(center_offset) * 5  # Slight vertical curve
		
		# Animate to position with proper timing (0.3s draw animation)
		var tween := create_tween()
		tween.set_trans(Tween.TRANS_CUBIC)
		tween.set_ease(Tween.EASE_OUT)
		tween.tween_property(card, "position", target_pos, 0.3)  # 0.3s as per diagram
		
		# Fan cards with 5° angles
		if is_player:
			var rotation := center_offset * FAN_ANGLE
			tween.parallel().tween_property(card, "rotation", rotation, 0.3)
		
		# Set z_index for proper overlap
		card.z_index = i
		
		# Ensure card can receive inputs
		if card.has_method("set_process"):
			card.set_process(true)

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
	_reset_turn_timer()

func _advance_phase() -> void:
	match current_phase:
		"draw":
			current_phase = "main"
			_execute_draw_phase()
		"main":
			current_phase = "combat"
			_execute_combat_phase()
		"combat":
			current_phase = "end"
			_execute_end_phase()
		"end":
			current_phase = "draw"
			current_turn += 1
			_switch_turn()
	
	_update_phase_display()
	_update_turn_display()
	_send({"type": "phase_change", "phase": current_phase})

func _execute_draw_phase() -> void:
	# Draw phase actions
	if is_my_turn:
		_draw_card_to_hand(true)
	# Trigger draw phase effects
	_trigger_phase_effects("draw")

func _execute_combat_phase() -> void:
	# Combat phase with lanes
	var player_units := player_board_container.get_children()
	var opponent_units := opponent_board_container.get_children()
	
	# Process each lane (6 lanes)
	for lane in range(6):
		var player_unit = null
		var opponent_unit = null
		
		if lane < player_units.size():
			player_unit = player_units[lane]
		if lane < opponent_units.size():
			opponent_unit = opponent_units[lane]
		
		if is_my_turn and player_unit:
			_process_unit_combat(player_unit, opponent_unit, true)
		elif not is_my_turn and opponent_unit:
			_process_unit_combat(opponent_unit, player_unit, false)
	
	# Process burn effects
	_process_burn_effects()
	
	_update_health_display()
	_check_victory_conditions()

func _process_unit_combat(attacker: Node, defender, is_player: bool) -> void:
	var damage := attacker.get_meta("attack", 1)
	var attacker_id := attacker.get_meta("card_id", "")
	var defender_id := "" if not defender else defender.get_meta("card_id", "")
	
	# Apply elemental interactions
	damage = _calculate_elemental_damage(attacker_id, defender_id, damage)
	
	# Apply suit style bonuses
	if attacker_id.begins_with("wands_"):
		damage += suit_styles["wands"]["damage_bonus"]
		# Apply burn
		if defender:
			defender.set_meta("burn", 2)
	elif attacker_id.begins_with("swords_") and defender:
		# Counter damage
		if is_player:
			player_health -= suit_styles["swords"]["counter_damage"]
		else:
			opponent_health -= suit_styles["swords"]["counter_damage"]
	
	if defender:
		var shield := defender.get_meta("shield", 0)
		damage = max(0, damage - shield)
		defender.set_meta("health", defender.get_meta("health", 3) - damage)
		if defender.get_meta("health", 0) <= 0:
			defender.queue_free()
	else:
		# Direct face damage
		if is_player:
			opponent_health -= damage
		else:
			player_health -= damage

func _calculate_elemental_damage(attacker_suit: String, defender_suit: String, base_damage: int) -> int:
	# Elemental interactions: Fire↔Water, Air↔Earth
	var damage := base_damage
	
	# Extract suits
	var att_suit := ""
	var def_suit := ""
	
	if attacker_suit.begins_with("wands_"): att_suit = "fire"
	elif attacker_suit.begins_with("cups_"): att_suit = "water"
	elif attacker_suit.begins_with("swords_"): att_suit = "air"
	elif attacker_suit.begins_with("pentacles_"): att_suit = "earth"
	
	if defender_suit.begins_with("wands_"): def_suit = "fire"
	elif defender_suit.begins_with("cups_"): def_suit = "water"
	elif defender_suit.begins_with("swords_"): def_suit = "air"
	elif defender_suit.begins_with("pentacles_"): def_suit = "earth"
	
	# Opposition interactions (deal more damage)
	if (att_suit == "fire" and def_suit == "water") or (att_suit == "water" and def_suit == "fire"):
		damage = int(damage * 1.5)
	elif (att_suit == "air" and def_suit == "earth") or (att_suit == "earth" and def_suit == "air"):
		damage = int(damage * 1.5)
	# Diagonal synergies (deal less damage to allies)
	elif (att_suit == "fire" and def_suit == "air") or (att_suit == "air" and def_suit == "fire"):
		damage = int(damage * 0.75)
	elif (att_suit == "water" and def_suit == "earth") or (att_suit == "earth" and def_suit == "water"):
		damage = int(damage * 0.75)
	
	return damage

func _process_burn_effects() -> void:
	for unit in player_board_container.get_children() + opponent_board_container.get_children():
		if unit.has_meta("burn"):
			var burn := unit.get_meta("burn", 0)
			if burn > 0:
				unit.set_meta("health", unit.get_meta("health", 3) - 1)
				unit.set_meta("burn", burn - 1)
				if unit.get_meta("health", 0) <= 0:
					unit.queue_free()

func _execute_end_phase() -> void:
	# End phase cleanup
	_trigger_phase_effects("end")
	# Clear temporary effects
	for boon in spread_bonuses:
		if boon.ends_with("_temp"):
			spread_bonuses.erase(boon)

func _trigger_phase_effects(phase: String) -> void:
	# Trigger effects based on phase
	for omen in current_run.get("omens", []):
		match omen:
			"fortune_reading":
				if phase == "draw":
					# Scry 1
					print("Fortune Reading: Scrying top card")

func _check_victory_conditions() -> void:
	# Check health victory
	if opponent_health <= 0:
		_trigger_victory("health")
	elif player_health <= 0:
		_handle_game_over({"winner": opponent_id, "type": "health"})
	
	# Check trials victory (already implemented in _check_trials_progress)

func _on_hand_toggle_pressed() -> void:
	player_hand_container.visible = not player_hand_container.visible
	hand_toggle_button.text = "▲ Show Hand" if not player_hand_container.visible else "▼ Hide Hand"

func _on_card_drag_ended(card: Node) -> void:
	# If card dragged over player's board, play it (same as click behavior)
	if not is_my_turn:
		return
	var zone = card.get_meta("zone", "")
	if zone != "player_hand":
		return
	if _is_over_player_board(card):
		if player_fate >= _get_card_cost(card):
			_play_card_from_hand(card)
	# Clear visuals
	_clear_target_lines()
	_clear_damage_previews()

func _on_card_drag_moved(card: Node) -> void:
	if not target_lines_node:
		return
	_clear_target_lines()
	# Draw a single target line to nearest opponent board slot center
	var best_i := _nearest_child_index(opponent_board_container, card.global_position)
	if best_i != -1:
		var child := opponent_board_container.get_child(best_i)
		var dst := (child as Node2D).get_global_position() if child is Node2D else null
		if dst != null:
			var line := Line2D.new()
			line.default_color = Color(0.1, 0.6, 1.0, 0.7)
			line.width = 3
			line.add_point(card.global_position)
			line.add_point(dst)
			target_lines_node.add_child(line)
			_show_damage_preview(dst, 2)
			_request_target_validation(best_i)

func _nearest_child_index(container: Node, from: Vector2) -> int:
	var best_i := -1
	var best_d := INF
	for i in range(container.get_child_count()):
		var child := container.get_child(i)
		if child is Node2D:
			var p := (child as Node2D).get_global_position()
			var d := from.distance_to(p)
			if d < best_d:
				best_d = d
				best_i = i
	return best_i

func _show_damage_preview(at: Vector2, amount: int) -> void:
	if not damage_previews_node:
		return
	_clear_damage_previews()
	var lbl := Label.new()
	lbl.text = "-" + str(amount)
	lbl.modulate = Color(1, 0.2, 0.2)
	lbl.position = at
	damage_previews_node.add_child(lbl)
	var tween := create_tween()
	tween.tween_property(lbl, "position:y", at.y - 20, 0.5)
	tween.parallel().tween_property(lbl, "modulate:a", 0.0, 0.5)
	tween.finished.connect(lbl.queue_free)

func _clear_target_lines() -> void:
	if not target_lines_node:
		return
	for c in target_lines_node.get_children():
		c.queue_free()
	_tint_target_lines(true)
	last_validated_idx = -1

func _clear_damage_previews() -> void:
	if not damage_previews_node:
		return
	for c in damage_previews_node.get_children():
		c.queue_free()

func _request_target_validation(index: int) -> void:
	if ws_client == null or ws_client.get_ready_state() != WebSocketPeer.STATE_OPEN:
		return
	if last_validated_idx == index and last_validation_cooldown > 0.0:
		return
	last_validated_idx = index
	last_validation_cooldown = 0.1
	var payload := {
		"type": "validate_target",
		"index": index,
		"matchId": match_id,
		"playerId": current_player_id
	}
	ws_client.send_text(JSON.stringify(payload))

func _tint_target_lines(valid: bool) -> void:
	if not target_lines_node:
		return
	for c in target_lines_node.get_children():
		if c is Line2D:
			(c as Line2D).default_color = valid?Color(0.1, 0.9, 0.3, 0.8): Color(0.9, 0.2, 0.2, 0.8)

func _is_over_player_board(card: Node) -> bool:
	# Compare card global position against player board container rect
	# Note: Works in practice despite Node2D vs Control, since both use viewport coordinates
	var rect: Rect2 = player_board_container.get_global_rect()
	var pos: Vector2 = card.global_position
	return rect.has_point(pos)

func _switch_turn() -> void:
	is_my_turn = not is_my_turn
	end_turn_button.disabled = not is_my_turn
	
	if get_meta("game_mode", "pvp") == "pve":
		if is_my_turn:
			# Player's turn - gain fate
			player_fate = min(player_max_fate, player_fate + fate_generation_per_turn)
			_draw_card_to_hand(true)
			_process_spread_bonuses(true)
			_check_trials_progress()
		else:
			# Opponent's turn
			opponent_fate = min(3, opponent_fate + fate_generation_per_turn)
			_draw_card_to_hand(false)
			_process_spread_bonuses(false)
			# Simulate AI turn after delay
            await get_tree().create_timer(1.0).timeout
            _simulate_ai_turn()
	
	_update_fate_display()
	_reset_turn_timer()

func _simulate_ai_turn() -> void:
	# Simple AI logic for PvE
    await get_tree().create_timer(0.5).timeout
	
	# AI plays a card
	var hand_cards := opponent_hand_container.get_children()
    if hand_cards.size() > 0 and opponent_fate > 0:
        var card := hand_cards[0]
        if card and card.has_method("set_card_back"):
            opponent_hand_container.remove_child(card)
            opponent_board_container.add_child(card)
            card.set_card_back(false)
            if card.has_method("load_card_image"):
                card.load_card_image("major_" + str(randi() % 22).pad_zeros(2), deck_name)
            opponent_fate -= 1
            _update_fate_display()
            _arrange_hand(false)
            _arrange_board(false)
	
    await get_tree().create_timer(0.5).timeout
	_advance_phase()

func _update_health_display() -> void:
	player_health_label.text = str(player_health) + "/" + str(player_max_health)
	opponent_health_label.text = str(opponent_health) + "/" + str(opponent_max_health)

func _update_fate_display() -> void:
	player_fate_label.text = "Fate: " + str(player_fate) + "/" + str(player_max_fate)
	opponent_fate_label.text = "Fate: " + str(opponent_fate) + "/3"
	# Update fate particles effect
	_show_fate_particles(player_fate > 0)

func _show_fate_particles(active: bool) -> void:
	if fate_particles and fate_particles is CPUParticles2D:
		(fate_particles as CPUParticles2D).emitting = active

func _update_trials_display() -> void:
	if trials_label:
		var sun := arcana_trials.get("sun", 0)
		var moon := arcana_trials.get("moon", 0) 
		var judge := arcana_trials.get("judgement", 0)
		trials_label.text = "Trials: Sun %d/100 | Moon %d/100 | Judge %d/100" % [sun, moon, judge]

func _on_flip_pressed() -> void:
	if player_fate < 1:
		return
	# Need to select a card to flip
	print("Select a card to flip orientation")

func _on_peek_pressed() -> void:
	if player_fate < 1:
		return
	player_fate -= 1
	_update_fate_display()
	# Scrying: Look at top 3 cards and rearrange
	_show_scrying_interface()
	_send({"type": "peek"})

func _show_scrying_interface() -> void:
	# Oracle Eye scrying interface
	var scry_panel := Panel.new()
	scry_panel.name = "ScryPanel"
	scry_panel.anchor_left = 0.3
	scry_panel.anchor_right = 0.7
	scry_panel.anchor_top = 0.3
	scry_panel.anchor_bottom = 0.7
	add_child(scry_panel)
	
	var title := Label.new()
	title.text = "Scrying - Rearrange Your Destiny"
	title.anchor_right = 1.0
	title.anchor_bottom = 0.15
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	scry_panel.add_child(title)
	
	var cards_container := HBoxContainer.new()
	cards_container.anchor_left = 0.1
	cards_container.anchor_right = 0.9
	cards_container.anchor_top = 0.2
	cards_container.anchor_bottom = 0.7
	scry_panel.add_child(cards_container)
	
	# Show top 3 cards from deck
	var scry_cards := []
	for i in range(3):
		var card := card_scene.instantiate()
		cards_container.add_child(card)
		card.load_card_image("wands_%02d" % randi_range(1, 14), deck_name)
		card.set_meta("scry_position", i)
		card.can_be_dragged = true
		scry_cards.append(card)
	
	var confirm_button := Button.new()
	confirm_button.text = "Accept Fate"
	confirm_button.anchor_left = 0.35
	confirm_button.anchor_right = 0.65
	confirm_button.anchor_top = 0.8
	confirm_button.anchor_bottom = 0.9
	scry_panel.add_child(confirm_button)
	confirm_button.pressed.connect(func(): scry_panel.queue_free())

func _on_force_draw_pressed() -> void:
	if player_fate < 2:
		return
	player_fate -= 2
	_update_fate_display()
	_draw_card_to_hand(true)
	_send({"type": "force_draw"})

func _on_block_flip_pressed() -> void:
	if player_fate < 2:
		return
	player_fate -= 2
	_update_fate_display()
	# Block next flip attempt
	_send({"type": "block_flip"})

func _on_divine_pressed() -> void:
	if player_fate < 3:
		return
	player_fate -= 3
	_update_fate_display()
	# Trigger divine intervention
	_send({"type": "divine_intervention"})

func _update_phase_display() -> void:
	phase_label.text = current_phase.capitalize()

func _update_turn_display() -> void:
	turn_label.text = "Turn " + str(current_turn)
	if is_my_turn:
		turn_label.modulate = Color.GREEN
	else:
		turn_label.modulate = Color.RED
	_update_turn_timer_visibility()

func _reset_turn_timer() -> void:
	turn_time_left = TURN_TIME_SECONDS
	if is_my_turn:
		turn_timer.start()
	else:
		turn_timer.stop()
	_update_turn_timer_visibility()
	_render_turn_timer()

func _on_turn_tick() -> void:
	if not is_my_turn:
		return
	turn_time_left = max(0, turn_time_left - 1)
	_render_turn_timer()
	if turn_time_left == 0:
		_on_end_turn_pressed()

func _render_turn_timer() -> void:
	if turn_timer_label:
		turn_timer_label.text = str(turn_time_left)
		if turn_time_left <= TURN_TIMER_WARN_AT:
			turn_timer_label.visible = true
		else:
			turn_timer_label.visible = false

func _update_turn_timer_visibility() -> void:
	if not turn_timer_label:
		return
	turn_timer_label.visible = is_my_turn and turn_time_left <= TURN_TIMER_WARN_AT

func _process(_delta: float) -> void:
	if ws_client:
		ws_client.poll()
		# Reconnect detection
		var st := ws_client.get_ready_state()
		if st == WebSocketPeer.STATE_CLOSED and not is_reconnecting and match_id != "":
			_start_reconnect()
			return
		
		if st == WebSocketPeer.STATE_OPEN:
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
	# Throttle for target validate
	last_validation_cooldown = max(0.0, last_validation_cooldown - _delta)

func _start_reconnect() -> void:
	is_reconnecting = true
	reconnect_attempts = 0
	_schedule_next_reconnect()
	_ensure_connection_overlay()
	_set_connection_status("Connection lost. Reconnecting…")
	_show_connection_overlay()

func _schedule_next_reconnect() -> void:
	var delay := min(10.0, 0.5 * pow(1.8, reconnect_attempts))
	reconnect_timer.wait_time = delay
	reconnect_timer.start()

func _attempt_reconnect() -> void:
	if not is_reconnecting:
		return
	reconnect_attempts += 1
	ws_client = WebSocketPeer.new()
	if ws_url != "":
		ws_client.connect_to_url(ws_url)
	# If still not open, schedule another attempt
	var st := ws_client.get_ready_state()
	if st != WebSocketPeer.STATE_OPEN:
		if reconnect_attempts >= MAX_RECONNECT_ATTEMPTS:
			_set_connection_status("Reconnect failed. You may forfeit or retry.")
			_ensure_connection_overlay()
			# Add Forfeit button lazily
			var panel := connection_overlay.get_node_or_null("Panel")
			if panel and not panel.has_node("Forfeit"):
				var forfeit := Button.new()
				forfeit.name = "Forfeit"
				forfeit.text = "Forfeit Match"
				forfeit.anchor_left = 0.35
				forfeit.anchor_top = 0.5
				forfeit.anchor_right = 0.65
				forfeit.anchor_bottom = 0.62
				panel.add_child(forfeit)
				forfeit.pressed.connect(_on_forfeit)
		else:
			_schedule_next_reconnect()
	else:
		is_reconnecting = false
		ws_joined = false
		_set_connection_status("Reconnected. Syncing state…")
		_hide_connection_overlay()

func _on_forfeit() -> void:
	# Return to menu and optionally notify server next time via flag
	var menu_scene := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu_scene)

func _open_reaction_window(event_desc := "Board change") -> void:
	_ensure_reaction_overlay()
	reaction_window_open = true
	reaction_desc = event_desc
	reaction_time_left = 10
	reaction_label.text = "Reaction Window: " + event_desc + " (" + str(reaction_time_left) + ")"
	_show_reaction_overlay()
	reaction_timer.start()

func _close_reaction_window() -> void:
	reaction_window_open = false
	_hide_reaction_overlay()
	reaction_timer.stop()

func _on_reaction_tick() -> void:
	if not reaction_window_open:
		return
	reaction_time_left = max(0, reaction_time_left - 1)
	if reaction_label:
		reaction_label.text = "Reaction Window: " + reaction_desc + " (" + str(reaction_time_left) + ")"
	if reaction_time_left == 0:
		_close_reaction_window()

func _ensure_connection_overlay() -> void:
	if connection_overlay:
		return
	var overlay := Control.new()
	overlay.name = "ConnectionOverlay"
	overlay.anchor_left = 0
	overlay.anchor_top = 0
	overlay.anchor_right = 1
	overlay.anchor_bottom = 1
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var panel := Panel.new()
	panel.name = "Panel"
	panel.custom_minimum_size = Vector2(420, 140)
	panel.anchor_left = 0.5
	panel.anchor_top = 0.1
	panel.anchor_right = 0.5
	panel.anchor_bottom = 0.1
	panel.offset_left = -210
	panel.offset_top = 0
	panel.offset_right = 210
	panel.offset_bottom = 140
	var label := Label.new()
	label.name = "Label"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.anchor_left = 0
	label.anchor_top = 0
	label.anchor_right = 1
	label.anchor_bottom = 0.6
	label.text = ""
	panel.add_child(label)
	var retry := Button.new()
	retry.name = "Retry"
	retry.text = "Retry now"
	retry.anchor_left = 0.35
	retry.anchor_top = 0.7
	retry.anchor_right = 0.65
	retry.anchor_bottom = 0.9
	panel.add_child(retry)
	overlay.add_child(panel)
	add_child(overlay)
	connection_overlay = overlay
	connection_status = label
	connection_retry_button = retry
	if not connection_retry_button.pressed.is_connected(_retry_now):
		connection_retry_button.pressed.connect(_retry_now)

func _set_connection_status(text: String) -> void:
	_ensure_connection_overlay()
	if connection_status:
		connection_status.text = text

func _show_connection_overlay() -> void:
	if connection_overlay:
		connection_overlay.visible = true

func _hide_connection_overlay() -> void:
	if connection_overlay:
		connection_overlay.visible = false

func _retry_now() -> void:
	if is_reconnecting:
		reconnect_timer.stop()
		_attempt_reconnect()

func _ensure_reaction_overlay() -> void:
	if reaction_overlay:
		return
	var overlay := Control.new()
	overlay.name = "ReactionOverlay"
	overlay.anchor_left = 0
	overlay.anchor_top = 0
	overlay.anchor_right = 1
	overlay.anchor_bottom = 1
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var panel := Panel.new()
	panel.name = "Panel"
	panel.custom_minimum_size = Vector2(420, 120)
	panel.anchor_left = 0.5
	panel.anchor_top = 0.2
	panel.anchor_right = 0.5
	panel.anchor_bottom = 0.2
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
	var row := HBoxContainer.new()
	row.anchor_left = 0
	row.anchor_top = 0.8
	row.anchor_right = 1
	row.anchor_bottom = 1
	var respond := Button.new()
	respond.text = "Respond"
	var passb := Button.new()
	passb.text = "Pass"
	row.add_child(respond)
	row.add_child(passb)
	panel.add_child(row)
	overlay.add_child(panel)
	add_child(overlay)
	reaction_overlay = overlay
	reaction_label = label
	if not respond.pressed.is_connected(_on_react):
		respond.pressed.connect(_on_react)
	if not passb.pressed.is_connected(_on_pass):
		passb.pressed.connect(_on_pass)

func _show_reaction_overlay() -> void:
	if reaction_overlay:
		reaction_overlay.visible = true

func _hide_reaction_overlay() -> void:
	if reaction_overlay:
		reaction_overlay.visible = false

func _on_react() -> void:
	_send_reaction("respond")
	_close_reaction_window()

func _on_pass() -> void:
	_send_reaction("pass")
	_close_reaction_window()

func _send_reaction(action: String) -> void:
	_send({
		"type": "reaction",
		"action": action
	})

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
				_hide_connection_overlay()
		"card_played":
			_handle_opponent_card_played(data)
		"turn_ended":
			_handle_turn_ended(data)
		"game_over":
			_handle_game_over(data)
			_show_pvp_result(data)
		"reaction_window":
			# Server-driven reaction window with optional duration
			var desc := str(data.get("event", "Reaction"))
			var dur := int(data.get("duration", 10))
			_open_reaction_window(desc)
			reaction_time_left = dur
		"reaction_close":
			_close_reaction_window()
		"target_valid":
			var idx := int(data.get("index", -1))
			if idx == last_validated_idx or last_validated_idx == -1:
				target_valid = bool(data.get("valid", true))
				_tint_target_lines(target_valid)

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
		_open_reaction_window("Opponent played a card")
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
		_open_reaction_window("Opponent played a card")

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
	_open_reaction_window("Turn changed")


func _handle_game_over(data: Dictionary) -> void:
	# Handle game over
	var winner: String = data.get("winner", "")
	print("Game Over! Winner: ", winner)
	
	# If this is a PvE battle, return to map
	if get_meta("return_to_map", false):
		_return_to_pve_map(winner == current_player_id)

func _show_pvp_result(data: Dictionary) -> void:
	if get_meta("return_to_map", false):
		return
	var winner := str(data.get("winner", ""))
	var rewards := data.get("rewards", {})
	var gold := 0
	if rewards is Dictionary and rewards.has("gold"):
		gold = int(rewards.get("gold"))
	var current_gold := int(ProjectSettings.get_setting("tarot/gold", 0))
	ProjectSettings.set_setting("tarot/gold", current_gold + gold)
	ProjectSettings.set_setting("tarot/pvp_last_winner", winner)
	ProjectSettings.set_setting("tarot/pvp_last_me", current_player_id)
	ProjectSettings.set_setting("tarot/pvp_last_gold", gold)
	ProjectSettings.save()
	# Show rewards screen first if present, then result
	if rewards is Dictionary and (rewards.has("gold") or rewards.has("cards")):
		var rscene := load("res://scenes/PVPRewards.tscn")
		var inst := rscene.instantiate()
		if inst and inst.has_method("set_rewards"):
			inst.call_deferred("set_rewards", rewards, winner, current_player_id)
		get_tree().change_scene_to_packed(rscene)
	else:
		var scene := load("res://scenes/PVPResult.tscn")
		var inst2 := scene.instantiate()
		if inst2 and inst2.has_method("set_result"):
			inst2.call_deferred("set_result", winner, current_player_id)
		get_tree().change_scene_to_packed(scene)

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
				var rect: Rect2 = Rect2(Vector2.ZERO, panel.size)
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
	# Cancel button
	var cancel := Button.new()
	cancel.name = "Cancel"
	cancel.text = "Cancel"
	cancel.anchor_left = 0.35
	cancel.anchor_top = 0.8
	cancel.anchor_right = 0.65
	cancel.anchor_bottom = 0.95
	panel.add_child(cancel)
	overlay.add_child(panel)
	add_child(overlay)
	match_overlay = overlay
	cancel_queue_button = cancel
	if not cancel_queue_button.pressed.is_connected(_cancel_queue):
		cancel_queue_button.pressed.connect(_cancel_queue)

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

func _cancel_queue() -> void:
	# Simple cancel: go back to menu
	var menu_scene := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu_scene)