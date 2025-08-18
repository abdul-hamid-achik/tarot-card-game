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
var deck_fragments := 0  # Currency for deck trading
var omens := []  # Active run modifiers
var boons := []  # Temporary buffs

# Map generation
var map_data := {}
var node_positions := {}
var connections := []
var current_region := 1
var total_regions := 3
var trials_completed := 0

# UI References
@onready var map_container := $MapContainer
@onready var nodes_container := $MapContainer/NodesContainer
@onready var paths_container := $MapContainer/PathsContainer
@onready var champion_panel := $ChampionPanel
@onready var run_info := $RunInfo
@onready var rewards_popup := $RewardsPopup
@onready var event_popup := $EventPopup
@onready var shop_popup := $ShopPopup
@onready var rest_popup := $RestPopup

# Visual settings
const NODE_SIZE := Vector2(64, 64)
const MAP_WIDTH := 900
const MAP_HEIGHT := 500
const NODES_PER_COLUMN := 3
const COLUMNS_PER_REGION := 5

# Event types
var event_variants := [
	{"name": "Fortune Teller", "choices": [
		{"text": "Accept Reading (-50g, +Omen)", "cost": 50, "reward": "omen"},
		{"text": "Decline", "cost": 0, "reward": "none"}
	]},
	{"name": "Mystic Merchant", "choices": [
		{"text": "Trade Cards (Remove 2, Add 1 Rare)", "cost": 0, "reward": "card_trade"},
		{"text": "Buy Fragments (100g for 50 fragments)", "cost": 100, "reward": "fragments"}
	]},
	{"name": "Ancient Shrine", "choices": [
		{"text": "Offer Health (-5 HP, +Major Arcana)", "cost": 5, "reward": "major_arcana"},
		{"text": "Meditate (+10 HP)", "cost": 0, "reward": "heal"}
	]},
	{"name": "Crossroads", "choices": [
		{"text": "Safe Path (No effect)", "cost": 0, "reward": "none"},
		{"text": "Risky Path (50% +Relic, 50% -10 HP)", "cost": 0, "reward": "risk"}
	]}
]

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
	if not _resume_if_available():
		_initialize_run()
		_generate_map()
		_render_map()
		_update_ui()
	# Wire save/back
	var save_btn := get_node_or_null("SaveButton") as Button
	var back_btn := get_node_or_null("BackButton") as Button
	var deck_btn := get_node_or_null("DeckButton") as Button
	if save_btn and not save_btn.pressed.is_connected(_save_run):
		save_btn.pressed.connect(_save_run)
	if back_btn and not back_btn.pressed.is_connected(_back_to_menu):
		back_btn.pressed.connect(_back_to_menu)
	if deck_btn and not deck_btn.pressed.is_connected(_show_deck):
		deck_btn.pressed.connect(_show_deck)

func _show_deck() -> void:
	var dlg := AcceptDialog.new()
	dlg.title = "Current Deck"
	dlg.size = Vector2i(500, 600)
	var list := RichTextLabel.new()
	list.bbcode_enabled = true
	list.anchor_left = 0.05
	list.anchor_top = 0.05
	list.anchor_right = 0.95
	list.anchor_bottom = 0.95
	var lines := []
	var sorted := current_run["deck"].duplicate()
	sorted.sort_custom(func(a, b):
		return str(a["id"]) < str(b["id"]))
	for entry in sorted:
		lines.append("[b]" + str(entry["id"]) + "[/b] x" + str(entry["count"]))
	list.text = "\n".join(lines)
	dlg.add_child(list)
	add_child(dlg)
	dlg.popup_centered()

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
			"relics": [], # Permanent passives
			"deck_fragments": 0, # Currency for deck trading
			"shop_remove_cost": 75,
			"shop_upgrade_cost": 100
		}
		current_node_id = 0
		completed_nodes = []
		run_seed = "run_" + str(Time.get_unix_time_from_system())
		# Apply preselected significator if passed via metadata
		if has_meta("significator"):
			current_run["significator"] = str(get_meta("significator"))
			current_run["deck"] = _get_starter_deck()

func _get_starter_deck() -> Array:
	# Return basic starter deck and include chosen significator as champion card
	var base := [
		{"id": "wands_01", "count": 2},
		{"id": "wands_02", "count": 2},
		{"id": "cups_01", "count": 2},
		{"id": "cups_02", "count": 2},
		{"id": "swords_01", "count": 2},
		{"id": "swords_02", "count": 2},
		{"id": "pentacles_01", "count": 2},
		{"id": "pentacles_02", "count": 2}
	]
	if current_run.has("significator") and str(current_run["significator"]) != "":
		base.append({"id": str(current_run["significator"]), "count": 1})
	return base

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
			sheet_num = "08" # Adjust to existing sheet set
		NodeType.SHOP:
			sheet_num = "07" # Adjust to existing sheet set
		NodeType.REST:
			sheet_num = "06" # Adjust to existing sheet set
		NodeType.TREASURE:
			sheet_num = "04" # Adjust to existing sheet set
		NodeType.MYSTERY:
			sheet_num = "03" # Adjust to existing sheet set
	
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

func _weighted_card_choices(count: int, rng: RandomNumberGenerator) -> Array:
	# Simple rarity weights: Common 70, Uncommon 25, Rare 5
	var commons := ["wands_03", "cups_03", "swords_03", "pentacles_03"]
	var uncommons := ["wands_04", "cups_04", "swords_04", "pentacles_04"]
	var rares := ["major_02", "major_03", "major_04"]
	var out := []
	for i in range(count):
		var roll := rng.randi_range(1, 100)
		if roll <= 5:
			out.append(rares[rng.randi() % rares.size()])
		elif roll <= 30:
			out.append(uncommons[rng.randi() % uncommons.size()])
		else:
			out.append(commons[rng.randi() % commons.size()])
	return out

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
	# Select random event variant
	var event := event_variants[randi() % event_variants.size()]
	
	# Setup event popup
	if event_popup:
		var title_label := event_popup.get_node_or_null("TitleLabel")
		if title_label:
			title_label.text = event["name"]
		
		var choices_container := event_popup.get_node_or_null("ChoicesContainer")
		if choices_container:
			# Clear existing choices
			for child in choices_container.get_children():
				child.queue_free()
			
			# Add new choice buttons
			for choice in event["choices"]:
				var btn := Button.new()
				btn.text = choice["text"]
				btn.pressed.connect(_on_event_choice.bind(choice, node_id))
				choices_container.add_child(btn)
		
		event_popup.popup_centered()

func _on_event_choice(choice: Dictionary, node_id: int) -> void:
	# Apply choice cost
	if choice["cost"] > 0:
		if choice["text"].contains("HP"):
			current_run["health"] -= choice["cost"]
		else:
			current_run["gold"] = max(0, current_run["gold"] - choice["cost"])
	
	# Apply reward
	match choice["reward"]:
		"omen":
			if not current_run.has("omens"):
				current_run["omens"] = []
			current_run["omens"].append("fortune_reading")
		"fragments":
			deck_fragments += 50
			current_run["deck_fragments"] = deck_fragments
		"major_arcana":
			_add_card_to_deck("major_%02d" % randi_range(0, 21))
		"heal":
			current_run["health"] = min(current_run["max_health"], current_run["health"] + 10)
		"card_trade":
			_show_card_trade_ui()
		"risk":
			if randf() > 0.5:
				# Win relic
				if not current_run.has("relics"):
					current_run["relics"] = []
				current_run["relics"].append("lucky_charm")
			else:
				# Lose health
				current_run["health"] -= 10
	
	if event_popup:
		event_popup.hide()
	_complete_node(node_id)

func _show_card_trade_ui() -> void:
	# Simple implementation: remove 2 random cards, add 1 rare
	if current_run["deck"].size() > 2:
		for i in range(2):
			if current_run["deck"].size() > 0:
				var idx := randi() % current_run["deck"].size()
				var card = current_run["deck"][idx]
				if card["count"] > 1:
					card["count"] -= 1
				else:
					current_run["deck"].remove_at(idx)
		_add_card_to_deck("major_%02d" % randi_range(0, 21))

func _show_shop(node_id: int) -> void:
	# Minimal shop: confirm to remove a card (cost 75g)
	_setup_shop_ui(node_id)
	shop_popup.popup_centered()

func _on_shop_confirm(node_id: int) -> void:
	if current_run["gold"] >= 75:
		current_run["gold"] -= 75
	_complete_node(node_id)

func _show_rest_site(node_id: int) -> void:
	_setup_rest_ui(node_id)
	rest_popup.popup_centered()

func _collect_treasure(node_id: int) -> void:
	var rewards = map_data[node_id]["rewards"]
	current_run["gold"] += rewards.get("gold", 0)
	# Show simple 3-card choice
	_show_card_choice(["wands_03", "cups_03", "swords_03"], node_id)

func _complete_node(node_id: int) -> void:
	completed_nodes.append(node_id)
	current_node_id = node_id
	if map_data.has(node_id):
		var t := map_data[node_id]["type"]
		if t == NodeType.BATTLE or t == NodeType.ELITE:
			trials_completed = min(3, trials_completed + 1)
	_update_available_nodes()
	_render_map()
	_update_ui()
	
	# Check if region complete
	if map_data[node_id]["type"] == NodeType.BOSS:
		_advance_to_next_region()
	if trials_completed >= 3:
		_complete_run()

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
	var scene := load("res://scenes/RunVictory.tscn")
	get_tree().change_scene_to_packed(scene)

func _update_ui() -> void:
	# Update champion/significator panel
	if champion_panel:
		champion_panel.get_node("HealthLabel").text = str(current_run["health"]) + "/" + str(current_run["max_health"])
		champion_panel.get_node("GoldLabel").text = "Gold: " + str(current_run["gold"])
		champion_panel.get_node("RegionLabel").text = "Region " + str(current_region) + "/" + str(total_regions)
		var trials := champion_panel.get_node_or_null("TrialsLabel")
		if trials:
			trials.text = "Trials " + str(trials_completed) + "/3"
		var name_label := champion_panel.get_node_or_null("NameLabel")
		if name_label and current_run.has("significator"):
			var sig := str(current_run["significator"])
			var name := ""
			if sig == "major_00":
				name = "The Fool"
			elif sig == "major_01":
				name = "The Magician"
			if name != "":
				name_label.text = name

func _on_return_from_battle(won: bool, rewards: Dictionary) -> void:
	if won:
		# Apply rewards
		current_run["gold"] += rewards.get("gold", 0)
		var rng := RandomNumberGenerator.new()
		rng.randomize()
		var choices := _weighted_card_choices(3, rng)
		_show_card_choice(choices, current_node_id)
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
	var scene := load("res://scenes/RunDefeat.tscn")
	get_tree().change_scene_to_packed(scene)

func _show_card_choice(ids: Array, node_id: int) -> void:
	rewards_popup.popup_centered()
	var c1 := rewards_popup.get_node_or_null("RewardsChoices/Choice1") as Button
	var c2 := rewards_popup.get_node_or_null("RewardsChoices/Choice2") as Button
	var c3 := rewards_popup.get_node_or_null("RewardsChoices/Choice3") as Button
	var skip := rewards_popup.get_node_or_null("Skip") as Button
	if c1:
		c1.text = str(ids[0])
		c1.modulate = _rarity_color(ids[0])
		c1.hint_tooltip = _card_hint(ids[0])
		c1.pressed.connect(_on_pick_reward.bind(ids[0], node_id), CONNECT_ONE_SHOT)
	if c2:
		c2.text = str(ids[1])
		c2.modulate = _rarity_color(ids[1])
		c2.hint_tooltip = _card_hint(ids[1])
		c2.pressed.connect(_on_pick_reward.bind(ids[1], node_id), CONNECT_ONE_SHOT)
	if c3:
		c3.text = str(ids[2])
		c3.modulate = _rarity_color(ids[2])
		c3.hint_tooltip = _card_hint(ids[2])
		c3.pressed.connect(_on_pick_reward.bind(ids[2], node_id), CONNECT_ONE_SHOT)
	if skip and not skip.pressed.is_connected(_on_skip_reward.bind(node_id)):
		skip.pressed.connect(_on_skip_reward.bind(node_id))

func _on_pick_reward(card_id: String, node_id: int) -> void:
	_add_card_to_deck(card_id)
	rewards_popup.hide()
	_complete_node(node_id)

func _on_skip_reward(node_id: int) -> void:
	rewards_popup.hide()
	_complete_node(node_id)

func _rarity_color(card_id: String) -> Color:
	if card_id.begins_with("major_"):
		return Color(0.9, 0.8, 0.3)
	if card_id.ends_with("_04"):
		return Color(0.6, 0.9, 0.6)
	return Color(0.8, 0.8, 0.8)

func _rarity_name(card_id: String) -> String:
	if card_id.begins_with("major_"):
		return "Rare"
	if card_id.ends_with("_04"):
		return "Uncommon"
	return "Common"

func _card_hint(card_id: String) -> String:
	var rarity := _rarity_name(card_id)
	var descs := {
		"wands_03": "Deal light damage.",
		"cups_03": "Heal a small amount.",
		"swords_03": "Piercing strike.",
		"pentacles_03": "Gain resources.",
		"wands_04": "Stronger attack.",
		"cups_04": "Bigger heal.",
		"swords_04": "Cleave two targets.",
		"pentacles_04": "Greater gain.",
		"major_02": "High-impact effect.",
		"major_03": "High-impact effect.",
		"major_04": "High-impact effect."
	}
	var d := descs.get(card_id, "A mysterious card.")
	return rarity + "\n" + d

func _save_run() -> void:
	var payload := {
		"run": current_run,
		"current_node_id": current_node_id,
		"completed_nodes": completed_nodes,
		"current_region": current_region,
		"trials_completed": trials_completed,
		"run_seed": run_seed
	}
	ProjectSettings.set_setting("tarot/pve_run", JSON.stringify(payload))
	ProjectSettings.save()

func _resume_if_available() -> bool:
	var raw := str(ProjectSettings.get_setting("tarot/pve_run", ""))
	if raw == "":
		return false
	var data = JSON.parse_string(raw)
	if not (data is Dictionary):
		return false
	if data.has("run"):
		current_run = data["run"]
	current_node_id = int(data.get("current_node_id", 0))
	completed_nodes = data.get("completed_nodes", [])
	current_region = int(data.get("current_region", 1))
	trials_completed = int(data.get("trials_completed", 0))
	run_seed = str(data.get("run_seed", "run_" + str(Time.get_unix_time_from_system())))
	_generate_map()
	_render_map()
	_update_ui()
	return true

func _back_to_menu() -> void:
	var menu := load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu)

func _setup_shop_ui(node_id: int) -> void:
	var gold_label := shop_popup.get_node_or_null("ShopUI/GoldLabel") as Label
	if gold_label:
		gold_label.text = "Gold: " + str(current_run["gold"])
	
	# Add fragment exchange option
	var fragment_container := shop_popup.get_node_or_null("ShopUI/FragmentExchange")
	if not fragment_container:
		fragment_container = VBoxContainer.new()
		fragment_container.name = "FragmentExchange"
		shop_popup.get_node("ShopUI").add_child(fragment_container)
	
	var fragment_label := Label.new()
	fragment_label.text = "Deck Fragments: %d / 1000" % deck_fragments
	fragment_container.add_child(fragment_label)
	
	var fragment_button := Button.new()
	fragment_button.text = "Exchange 1000 Fragments for Full Deck"
	fragment_button.disabled = deck_fragments < 1000
	if deck_fragments >= 1000:
		fragment_button.pressed.connect(_exchange_fragments.bind(node_id))
	fragment_container.add_child(fragment_button)
	
	# Generate 3 choices
	# Note: rng variable already exists from _weighted_card_choices calls

func _exchange_fragments(node_id: int) -> void:
	if deck_fragments >= 1000:
		deck_fragments -= 1000
		current_run["deck_fragments"] = deck_fragments
		# Unlock a full deck
		var decks := ["marigold", "arcana", "duality"]
		var chosen_deck := decks[randi() % decks.size()]
		_unlock_full_deck(chosen_deck)
		_update_ui()
		shop_popup.hide()

func _show_unlock_ceremony(deck_id: String) -> void:
	# Show deck unlock ceremony animation
	var ceremony_popup := AcceptDialog.new()
	ceremony_popup.title = "Deck Unlocked!"
	ceremony_popup.dialog_text = "You have unlocked the " + deck_id.capitalize() + " deck!"
	ceremony_popup.ok_button_text = "Continue"
	add_child(ceremony_popup)
	ceremony_popup.popup_centered()
	
	# Particle effects
	var particles := CPUParticles2D.new()
	particles.position = get_viewport().size / 2
	particles.emitting = true
	particles.amount = 100
	particles.lifetime = 2.0
	particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	particles.spread = 45
	particles.initial_velocity_min = 100
	particles.initial_velocity_max = 300
	particles.scale_amount_min = 0.5
	particles.scale_amount_max = 2.0
	particles.color = Color(1.0, 0.9, 0.3)
	add_child(particles)
	
	# Auto-cleanup
	await get_tree().create_timer(3.0).timeout
	if particles:
		particles.queue_free()

func _unlock_full_deck(deck_id: String) -> void:
	# Unlock all 78 cards for a deck
	var all_cards := []
	# Major Arcana
	for i in range(22):
		all_cards.append("major_%02d" % i)
	# Minor Arcana
	for suit in ["wands", "cups", "swords", "pentacles"]:
		for i in range(1, 15):
			all_cards.append("%s_%02d" % [suit, i])
	
	# Save to collection
	var deck_progress = ProjectSettings.get_setting("tarot/deck_progress", {})
	if not deck_progress.has(deck_id):
		deck_progress[deck_id] = {}
	deck_progress[deck_id]["unlocked_list"] = all_cards
	deck_progress[deck_id]["cards_unlocked"] = 78
	deck_progress[deck_id]["completion"] = 100.0
	
	var owned_decks = ProjectSettings.get_setting("tarot/owned_decks", {})
	owned_decks[deck_id] = true
	
	ProjectSettings.set_setting("tarot/deck_progress", deck_progress)
	ProjectSettings.set_setting("tarot/owned_decks", owned_decks)
	ProjectSettings.save()
	
	_show_unlock_ceremony("Full %s Deck Unlocked!" % deck_id.capitalize())
	rng.randomize()
	var choices := _weighted_card_choices(3, rng)
	for i in range(3):
		var path := "ShopUI/CardsRow/Buy" + str(i + 1)
		var btn := shop_popup.get_node_or_null(path) as Button
		if btn:
			var id := str(choices[i])
			btn.text = id + " (" + str(current_run.get("shop_upgrade_cost", 100)) + "g)"
			btn.modulate = _rarity_color(id)
			btn.pressed.connect(_on_shop_buy.bind(id), CONNECT_ONE_SHOT)
	# Remove / Upgrade
	var rem := shop_popup.get_node_or_null("ShopUI/ActionsRow/Remove") as Button
	var upg := shop_popup.get_node_or_null("ShopUI/ActionsRow/Upgrade") as Button
	if rem and not rem.pressed.is_connected(_on_shop_remove):
		rem.pressed.connect(_on_shop_remove)
	if upg and not upg.pressed.is_connected(_on_shop_upgrade):
		upg.pressed.connect(_on_shop_upgrade)
	# Close handlers
	if not shop_popup.confirmed.is_connected(_on_shop_close):
		shop_popup.confirmed.connect(_on_shop_close)


func _on_shop_buy(card_id: String) -> void:
	var cost := int(current_run.get("shop_upgrade_cost", 100))
	if current_run["gold"] < cost:
		return
	current_run["gold"] -= cost
	_add_card_to_deck(card_id)
	_update_ui()


func _on_shop_remove() -> void:
	var rcost := int(current_run.get("shop_remove_cost", 75))
	if current_run["gold"] < rcost:
		return
	current_run["gold"] -= rcost
	_select_card_from_deck("Remove a card", func(idx, entry):
		if entry["count"] > 0:
			entry["count"] -= 1
			if entry["count"] == 0:
				current_run["deck"].remove_at(idx)
		_update_ui()
	)
	_update_ui()

func _on_shop_upgrade() -> void:
	if current_run["gold"] < 100:
		return
	current_run["gold"] -= 100
	_select_card_from_deck("Upgrade a card", func(idx, entry):
		if entry["id"].ends_with("_03"):
			entry["id"] = entry["id"].substr(0, entry["id"].length() - 3) + "_04"
		_update_ui()
	)
	_update_ui()

func _on_shop_close() -> void:
	shop_popup.hide()

func _setup_rest_ui(node_id: int) -> void:
	var heal := rest_popup.get_node_or_null("RestUI/HealButton") as Button
	var upg := rest_popup.get_node_or_null("RestUI/UpgradeButton") as Button
	if heal and not heal.pressed.is_connected(_on_rest_heal.bind(node_id)):
		heal.pressed.connect(_on_rest_heal.bind(node_id))
	if upg and not upg.pressed.is_connected(_on_rest_upgrade.bind(node_id)):
		upg.pressed.connect(_on_rest_upgrade.bind(node_id))

func _on_rest_heal(node_id: int) -> void:
	current_run["health"] = min(current_run["health"] + 10, current_run["max_health"])
	trials_completed = min(3, trials_completed) # no change
	_update_ui()
	rest_popup.hide()
	_complete_node(node_id)

func _on_rest_upgrade(node_id: int) -> void:
	_select_card_from_deck("Upgrade a card", func(idx, entry):
		if entry["id"].ends_with("_03"):
			entry["id"] = entry["id"].substr(0, entry["id"].length() - 3) + "_04"
		else:
			current_run["boons"].append("well_restored")
		_update_ui()
	)
	_update_ui()
	rest_popup.hide()
	_complete_node(node_id)

func _select_card_from_deck(title: String, callback: Callable) -> void:
	var dlg := AcceptDialog.new()
	dlg.title = title
	dlg.size = Vector2i(500, 600)
	var list := VBoxContainer.new()
	list.anchor_left = 0.05
	list.anchor_top = 0.05
	list.anchor_right = 0.95
	list.anchor_bottom = 0.95
	for i in range(current_run["deck"].size()):
		var entry = current_run["deck"][i]
		var btn := Button.new()
		btn.text = str(entry["id"]) + " x" + str(entry["count"])
		btn.modulate = _rarity_color(str(entry["id"]))
		btn.pressed.connect(func():
			callback.call(i, entry)
			dlg.queue_free()
		)
		list.add_child(btn)
	dlg.add_child(list)
	add_child(dlg)
	dlg.popup_centered()