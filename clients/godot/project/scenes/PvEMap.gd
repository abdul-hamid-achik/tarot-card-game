extends Control

# Node types matching LoR style
enum NodeType {
	BATTLE, # Standard enemy encounter
	ELITE, # Harder battle with better rewards
	BOSS, # Region boss
	EVENT, # Random event (choose outcome)
	SHOP, # Buy cards/upgrades
	REST, # Heal or upgrade card
	TREASURE, # Free reward
	MYSTERY # Unknown until revealed
}

# Run state
var current_run := {}
var current_node_id := 0
var completed_nodes := []
var available_nodes := []
var run_seed := ""
var significator := "" # Major Arcana chosen as champion

# Map generation
var map_data := {}
var node_positions := {}
var connections := []
var current_region := 1
var total_regions := 3

# UI References
@onready var map_container := $MapContainer
@onready var nodes_container := $MapContainer/NodesContainer
@onready var paths_container := $MapContainer/PathsContainer
@onready var champion_panel := $ChampionPanel
@onready var run_info := $RunInfo
@onready var rewards_popup := $RewardsPopup
@onready var event_popup := $EventPopup
@onready var shop_popup := $ShopPopup

# Visual settings
const NODE_SIZE := Vector2(64, 64)
const MAP_WIDTH := 900
const MAP_HEIGHT := 500
const NODES_PER_COLUMN := 3
const COLUMNS_PER_REGION := 5

# Node scene (created programmatically, no preload needed)

# Colors for node types (matching LoR style)
var node_colors := {
	NodeType.BATTLE: Color(0.4, 0.6, 0.8), # Blue
	NodeType.ELITE: Color(0.8, 0.6, 0.2), # Gold
	NodeType.BOSS: Color(0.8, 0.2, 0.2), # Red
	NodeType.EVENT: Color(0.6, 0.4, 0.8), # Purple
	NodeType.SHOP: Color(0.2, 0.8, 0.4), # Green
	NodeType.REST: Color(0.8, 0.8, 0.4), # Yellow
	NodeType.TREASURE: Color(0.8, 0.6, 0.8), # Pink
	NodeType.MYSTERY: Color(0.5, 0.5, 0.5) # Gray
}

func _ready() -> void:
	_initialize_run()
	_generate_map()
	_render_map()
	_update_ui()

func _initialize_run() -> void:
	# Check if continuing a run
	if current_run.is_empty():
		current_run = {
			"significator": "",
			"deck": _get_starter_deck(),
			"health": 30,
			"max_health": 30,
			"gold": 100,
			"completed_battles": 0,
			"omens": [], # PvE-specific modifiers
			"boons": [], # Temporary buffs
			"relics": [] # Permanent passives
		}
		current_node_id = 0
		completed_nodes = []
		run_seed = "run_" + str(Time.get_unix_time_from_system())

func _get_starter_deck() -> Array:
	# Return basic starter deck based on chosen significator
	return [
		{"id": "wands_01", "count": 2},
		{"id": "wands_02", "count": 2},
		{"id": "cups_01", "count": 2},
		{"id": "cups_02", "count": 2},
		{"id": "swords_01", "count": 2},
		{"id": "swords_02", "count": 2},
		{"id": "pentacles_01", "count": 2},
		{"id": "pentacles_02", "count": 2}
	]

func _generate_map() -> void:
	map_data.clear()
	node_positions.clear()
	connections.clear()
	
	var node_id := 0
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(run_seed + str(current_region))
	
	# Generate nodes for current region
	for col in range(COLUMNS_PER_REGION):
		var nodes_in_column := []
		var node_count := rng.randi_range(2, NODES_PER_COLUMN)
		
		for row in range(node_count):
			var node_type := _get_node_type_for_position(col, rng)
			var pos := _calculate_node_position(col, row, node_count)
			
			map_data[node_id] = {
				"id": node_id,
				"type": node_type,
				"position": pos,
				"column": col,
				"completed": node_id in completed_nodes,
				"available": false,
				"rewards": _generate_rewards_for_node(node_type, rng)
			}
			
			node_positions[node_id] = pos
			nodes_in_column.append(node_id)
			node_id += 1
		
		# Connect to previous column
		if col > 0:
			_connect_columns(col - 1, col, rng)
	
	# Mark starting nodes as available
	if current_node_id == 0:
		for id in map_data:
			if map_data[id]["column"] == 0:
				map_data[id]["available"] = true
	else:
		_update_available_nodes()

func _get_node_type_for_position(column: int, rng: RandomNumberGenerator) -> NodeType:
	# Boss at the end of each region
	if column == COLUMNS_PER_REGION - 1:
		return NodeType.BOSS
	
	# First column is always battles
	if column == 0:
		return NodeType.BATTLE
	
	# Random distribution for middle columns
	var roll := rng.randf()
	if roll < 0.4:
		return NodeType.BATTLE
	elif roll < 0.55:
		return NodeType.ELITE
	elif roll < 0.7:
		return NodeType.EVENT
	elif roll < 0.8:
		return NodeType.SHOP
	elif roll < 0.9:
		return NodeType.REST
	else:
		return NodeType.TREASURE

func _calculate_node_position(column: int, row: int, total_rows: int) -> Vector2:
	var x := 100 + column * (MAP_WIDTH / COLUMNS_PER_REGION)
	var y_spacing := MAP_HEIGHT / (total_rows + 1)
	var y := y_spacing * (row + 1)
	
	# Add some random offset for organic feel
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(str(column) + str(row))
	x += rng.randf_range(-20, 20)
	y += rng.randf_range(-30, 30)
	
	return Vector2(x, y)

func _connect_columns(from_col: int, to_col: int, rng: RandomNumberGenerator) -> void:
	var from_nodes := []
	var to_nodes := []
	
	for id in map_data:
		if map_data[id]["column"] == from_col:
			from_nodes.append(id)
		elif map_data[id]["column"] == to_col:
			to_nodes.append(id)
	
	# Ensure each node has at least one connection
	for from_id in from_nodes:
		if to_nodes.size() > 0:
			var to_id = to_nodes[rng.randi() % to_nodes.size()]
			connections.append({"from": from_id, "to": to_id})
	
	for to_id in to_nodes:
		var has_connection := false
		for conn in connections:
			if conn["to"] == to_id:
				has_connection = true
				break
		
		if not has_connection and from_nodes.size() > 0:
			var from_id = from_nodes[rng.randi() % from_nodes.size()]
			connections.append({"from": from_id, "to": to_id})
	
	# Add some extra connections for variety
	var extra_connections := rng.randi_range(0, min(from_nodes.size(), to_nodes.size()) - 1)
	for i in range(extra_connections):
		if from_nodes.size() > 0 and to_nodes.size() > 0:
			connections.append({
				"from": from_nodes[rng.randi() % from_nodes.size()],
				"to": to_nodes[rng.randi() % to_nodes.size()]
			})

func _generate_rewards_for_node(type: NodeType, rng: RandomNumberGenerator) -> Dictionary:
	var rewards := {}
	
	match type:
		NodeType.BATTLE:
			rewards["gold"] = rng.randi_range(20, 40)
			rewards["cards"] = _generate_card_rewards(1, rng)
		NodeType.ELITE:
			rewards["gold"] = rng.randi_range(50, 80)
			rewards["cards"] = _generate_card_rewards(2, rng)
			rewards["relic_chance"] = 0.3
		NodeType.BOSS:
			rewards["gold"] = rng.randi_range(100, 150)
			rewards["cards"] = _generate_card_rewards(3, rng)
			rewards["relic"] = true
		NodeType.TREASURE:
			rewards["gold"] = rng.randi_range(30, 60)
			if rng.randf() < 0.5:
				rewards["cards"] = _generate_card_rewards(1, rng)
		NodeType.EVENT:
			# Event rewards are determined by choices
			pass
		NodeType.SHOP:
			# Shop doesn't give rewards, it sells items
			pass
		NodeType.REST:
			rewards["heal"] = 10
	
	return rewards

func _generate_card_rewards(count: int, rng: RandomNumberGenerator) -> Array:
	var cards := []
	var available_cards := ["wands_03", "cups_03", "swords_03", "pentacles_03",
							"wands_04", "cups_04", "swords_04", "pentacles_04"]
	
	for i in range(count):
		cards.append(available_cards[rng.randi() % available_cards.size()])
	
	return cards

func _render_map() -> void:
	# Clear existing nodes
	for child in nodes_container.get_children():
		child.queue_free()
	
	# Render paths first (so they appear behind nodes)
	_render_paths()
	
	# Render nodes
	for id in map_data:
		var node_data = map_data[id]
		var node := _create_node_visual(node_data)
		nodes_container.add_child(node)

func _create_node_visual(data: Dictionary) -> Control:
	var node := Button.new()
	node.position = data["position"]
	node.size = NODE_SIZE
	node.pivot_offset = NODE_SIZE / 2
	
	# Style based on type
	var style := StyleBoxFlat.new()
	style.bg_color = node_colors[data["type"]]
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	
	if data["completed"]:
		style.bg_color = style.bg_color.darkened(0.5)
		style.border_color = Color.GRAY
		node.disabled = true
	elif data["available"]:
		style.border_color = Color.YELLOW
		node.modulate = Color(1.2, 1.2, 1.2)
		
		# Pulse animation for available nodes
		var tween := create_tween()
		tween.set_loops()
		tween.tween_property(node, "scale", Vector2(1.1, 1.1), 0.5)
		tween.tween_property(node, "scale", Vector2(1.0, 1.0), 0.5)
	else:
		style.border_color = Color.DARK_GRAY
		node.disabled = true
		node.modulate = Color(0.7, 0.7, 0.7)
	
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	
	node.add_theme_stylebox_override("normal", style)
	node.add_theme_stylebox_override("hover", style)
	node.add_theme_stylebox_override("pressed", style)
	
	# Add icon based on type - use TextureRect for pixel art
	var icon := TextureRect.new()
	icon.anchor_right = 1.0
	icon.anchor_bottom = 1.0
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	
	# Load appropriate pixel art icon
	var http := HTTPRequest.new()
	node.add_child(http)
	var icon_url := _get_icon_url_for_type(data["type"])
	http.request_completed.connect(_on_icon_loaded.bind(icon))
	http.request(icon_url)
	
	node.add_child(icon)
	
	# Connect click event
	if data["available"]:
		node.pressed.connect(_on_node_clicked.bind(data["id"]))
	
	return node

func _get_icon_url_for_type(type: NodeType) -> String:
	var origin := ""
	var env := OS.get_environment("TAROT_API_ORIGIN")
	if env != "":
		origin = env
	elif OS.has_feature("web"):
		var o: String = str(JavaScriptBridge.eval("location.origin"))
		if o != "":
			origin = o
	if origin == "":
		origin = "http://localhost:3000"

	var sheet_num := ""
	match type:
		NodeType.BATTLE:
			sheet_num = "01" # Sword icon
		NodeType.ELITE:
			sheet_num = "05" # Shield icon
		NodeType.BOSS:
			sheet_num = "09" # Crown/boss icon
		NodeType.EVENT:
			sheet_num = "13" # Question mark
		NodeType.SHOP:
			sheet_num = "17" # Coin/shop icon
		NodeType.REST:
			sheet_num = "21" # Heart/rest icon
		NodeType.TREASURE:
			sheet_num = "25" # Chest icon
		NodeType.MYSTERY:
			sheet_num = "29" # Mystery icon
	
	return origin + "/api/ui/themes/pixel-pack/sheets/card_ui_" + sheet_num + ".png"

func _on_icon_loaded(_result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray, icon: TextureRect) -> void:
	if response_code != 200:
		return
	var img := Image.new()
	if img.load_png_from_buffer(body) != OK:
		return
	var tex := ImageTexture.create_from_image(img)
	icon.texture = tex

func _render_paths() -> void:
	# Clear existing paths
	for child in paths_container.get_children():
		child.queue_free()
	
	# Draw connection lines
	for conn in connections:
		var from_pos = node_positions[conn["from"]] + NODE_SIZE / 2
		var to_pos = node_positions[conn["to"]] + NODE_SIZE / 2
		
		var line := Line2D.new()
		line.add_point(from_pos)
		line.add_point(to_pos)
		line.width = 3.0
		
		# Color based on completion status
		if conn["from"] in completed_nodes and conn["to"] in completed_nodes:
			line.default_color = Color(0.3, 0.3, 0.3)
		elif conn["from"] in completed_nodes:
			line.default_color = Color(0.8, 0.8, 0.4)
		else:
			line.default_color = Color(0.2, 0.2, 0.3)
		
		paths_container.add_child(line)

func _on_node_clicked(node_id: int) -> void:
	var node_data = map_data[node_id]
	
	match node_data["type"]:
		NodeType.BATTLE, NodeType.ELITE, NodeType.BOSS:
			_start_battle(node_id)
		NodeType.EVENT:
			_show_event(node_id)
		NodeType.SHOP:
			_show_shop(node_id)
		NodeType.REST:
			_show_rest_site(node_id)
		NodeType.TREASURE:
			_collect_treasure(node_id)

func _start_battle(node_id: int) -> void:
	# Save current node
	current_node_id = node_id
	
	# Prepare battle data
	var node_data = map_data[node_id]
	var enemy_deck := _generate_enemy_deck(node_data["type"])
	
	# Launch GameBoard scene in PvE mode
	var scene := load("res://scenes/GameBoard.tscn")
	var instance: Node = scene.instantiate()
	instance.set_meta("game_mode", "pve")
	instance.set_meta("enemy_type", node_data["type"])
	instance.set_meta("enemy_deck", enemy_deck)
	instance.set_meta("player_deck", current_run["deck"])
	instance.set_meta("player_health", current_run["health"])
	instance.set_meta("omens", current_run["omens"])
	instance.set_meta("boons", current_run["boons"])
	instance.set_meta("return_to_map", true)
	instance.set_meta("node_id", node_id)
	
	get_tree().root.add_child(instance)
	queue_free()

func _generate_enemy_deck(type: NodeType) -> Array:
	# Generate enemy deck based on node type
	var deck := []
	
	match type:
		NodeType.BATTLE:
			# Basic enemy deck
			deck = [
				{"id": "wands_01", "count": 3},
				{"id": "cups_01", "count": 3},
				{"id": "swords_01", "count": 3},
				{"id": "pentacles_01", "count": 3}
			]
		NodeType.ELITE:
			# Stronger enemy deck
			deck = [
				{"id": "wands_02", "count": 2},
				{"id": "cups_02", "count": 2},
				{"id": "swords_02", "count": 2},
				{"id": "pentacles_02", "count": 2},
				{"id": "major_07", "count": 1} # Add a Major Arcana
			]
		NodeType.BOSS:
			# Boss deck with multiple Major Arcana
			deck = [
				{"id": "wands_03", "count": 2},
				{"id": "cups_03", "count": 2},
				{"id": "swords_03", "count": 2},
				{"id": "pentacles_03", "count": 2},
				{"id": "major_13", "count": 1}, # Death
				{"id": "major_16", "count": 1} # Tower
			]
	
	return deck

func _show_event(node_id: int) -> void:
	event_popup.popup_centered()
	# TODO: Load event data and choices

func _show_shop(node_id: int) -> void:
	shop_popup.popup_centered()
	# TODO: Generate shop inventory

func _show_rest_site(node_id: int) -> void:
	# Simple heal option for now
	current_run["health"] = min(current_run["health"] + 10, current_run["max_health"])
	_complete_node(node_id)

func _collect_treasure(node_id: int) -> void:
	var rewards = map_data[node_id]["rewards"]
	current_run["gold"] += rewards.get("gold", 0)
	
	# Show rewards popup
	rewards_popup.popup_centered()
	# TODO: Display rewards
	
	_complete_node(node_id)

func _complete_node(node_id: int) -> void:
	completed_nodes.append(node_id)
	current_node_id = node_id
	_update_available_nodes()
	_render_map()
	_update_ui()
	
	# Check if region complete
	if map_data[node_id]["type"] == NodeType.BOSS:
		_advance_to_next_region()

func _update_available_nodes() -> void:
	available_nodes.clear()
	
	for conn in connections:
		if conn["from"] == current_node_id:
			if not conn["to"] in completed_nodes:
				available_nodes.append(conn["to"])
				map_data[conn["to"]]["available"] = true

func _advance_to_next_region() -> void:
	current_region += 1
	if current_region > total_regions:
		_complete_run()
	else:
		_generate_map()
		_render_map()

func _complete_run() -> void:
	# Show victory screen
	print("Run Complete!")
	# TODO: Show rewards and stats

func _update_ui() -> void:
	# Update champion/significator panel
	if champion_panel:
		champion_panel.get_node("HealthLabel").text = str(current_run["health"]) + "/" + str(current_run["max_health"])
		champion_panel.get_node("GoldLabel").text = "Gold: " + str(current_run["gold"])
		champion_panel.get_node("RegionLabel").text = "Region " + str(current_region) + "/" + str(total_regions)

func _on_return_from_battle(won: bool, rewards: Dictionary) -> void:
	if won:
		# Apply rewards
		current_run["gold"] += rewards.get("gold", 0)
		
		# Add cards to deck
		for card_id in rewards.get("cards", []):
			_add_card_to_deck(card_id)
		
		_complete_node(current_node_id)
	else:
		# Handle defeat
		current_run["health"] -= 5
		if current_run["health"] <= 0:
			_end_run()

func _add_card_to_deck(card_id: String) -> void:
	for card in current_run["deck"]:
		if card["id"] == card_id:
			card["count"] += 1
			return
	
	current_run["deck"].append({"id": card_id, "count": 1})

func _end_run() -> void:
	# Return to menu
	var menu_scene := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu_scene)