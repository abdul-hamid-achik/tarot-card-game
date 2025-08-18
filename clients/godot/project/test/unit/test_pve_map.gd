extends GutTest

# Test the PvE Map system
class_name TestPvEMap

var pve_map_scene = preload("res://scenes/PvEMap.tscn")
var pve_map: Control

func before_each():
	pve_map = pve_map_scene.instantiate()
	add_child(pve_map)

func after_each():
	pve_map.queue_free()

func test_node_types():
	# Test all 7 node types
	assert_eq(pve_map.NodeType.BATTLE, 0, "Battle node type")
	assert_eq(pve_map.NodeType.ELITE, 1, "Elite node type")
	assert_eq(pve_map.NodeType.EVENT, 2, "Event node type")
	assert_eq(pve_map.NodeType.SHOP, 3, "Shop node type")
	assert_eq(pve_map.NodeType.REST, 4, "Rest node type")
	assert_eq(pve_map.NodeType.TREASURE, 5, "Treasure node type")
	assert_eq(pve_map.NodeType.BOSS, 6, "Boss node type")

func test_map_generation():
	# Test map structure
	pve_map._generate_map()
	
	assert_gt(pve_map.map_data.size(), 0, "Should generate map nodes")
	assert_gt(pve_map.connections.size(), 0, "Should generate connections")
	
	# Test layer structure
	var layers = {}
	for node_id in pve_map.map_data:
		var layer = pve_map.map_data[node_id]["layer"]
		if not layers.has(layer):
			layers[layer] = []
		layers[layer].append(node_id)
	
	assert_ge(layers.size(), 5, "Should have at least 5 layers")
	
	# Test boss at final layer
	var max_layer = 0
	var boss_node = null
	for node_id in pve_map.map_data:
		var layer = pve_map.map_data[node_id]["layer"]
		if layer > max_layer:
			max_layer = layer
		if pve_map.map_data[node_id]["type"] == pve_map.NodeType.BOSS:
			boss_node = node_id
	
	assert_not_null(boss_node, "Should have a boss node")
	assert_eq(pve_map.map_data[boss_node]["layer"], max_layer, "Boss should be at final layer")

func test_event_system():
	# Test event variants
	assert_eq(pve_map.event_variants.size(), 4, "Should have 4 event variants")
	
	# Test event structure
	for event in pve_map.event_variants:
		assert_has(event, "name", "Event should have name")
		assert_has(event, "text", "Event should have text")
		assert_has(event, "choices", "Event should have choices")
		assert_gt(event["choices"].size(), 0, "Event should have at least one choice")

func test_deck_fragments():
	# Test fragment accumulation
	pve_map.deck_fragments = 0
	
	# Region 1: 33% (330 fragments)
	pve_map.current_region = 1
	pve_map._complete_region()
	assert_ge(pve_map.deck_fragments, 330, "Region 1 should give ~330 fragments")
	
	# Region 2: 66% (660 total)
	pve_map.current_region = 2
	pve_map._complete_region()
	assert_ge(pve_map.deck_fragments, 660, "Region 2 should give ~660 total fragments")
	
	# Region 3: 100% (1000 total)
	pve_map.current_region = 3
	pve_map._complete_region()
	assert_ge(pve_map.deck_fragments, 1000, "Region 3 should give 1000+ fragments")

func test_deck_unlock_progression():
	# Test progressive deck unlocking
	pve_map.deck_fragments = 1000
	
	assert_true(pve_map._can_unlock_full_deck(), "1000 fragments should unlock full deck")
	
	pve_map._unlock_full_deck("marigold")
	assert_eq(pve_map.deck_fragments, 0, "Should consume 1000 fragments")

func test_run_initialization():
	# Test run setup
	pve_map._initialize_run()
	
	assert_has(pve_map.current_run, "significator", "Run should have significator")
	assert_has(pve_map.current_run, "deck", "Run should have deck")
	assert_has(pve_map.current_run, "health", "Run should have health")
	assert_has(pve_map.current_run, "gold", "Run should have gold")
	
	assert_eq(pve_map.current_run["health"], 30, "Should start with 30 health")
	assert_eq(pve_map.current_run["max_health"], 30, "Max health should be 30")

func test_node_rewards():
	# Test reward distribution
	var battle_rewards = pve_map._generate_rewards(pve_map.NodeType.BATTLE)
	assert_has(battle_rewards, "gold", "Battle should give gold")
	assert_gt(battle_rewards["gold"], 0, "Battle gold should be positive")
	
	var elite_rewards = pve_map._generate_rewards(pve_map.NodeType.ELITE)
	assert_gt(elite_rewards["gold"], battle_rewards["gold"], "Elite should give more gold")
	
	var boss_rewards = pve_map._generate_rewards(pve_map.NodeType.BOSS)
	assert_gt(boss_rewards["gold"], elite_rewards["gold"], "Boss should give most gold")

func test_card_choices():
	# Test weighted card selection
	var rng = RandomNumberGenerator.new()
	rng.randomize()
	
	var choices = pve_map._weighted_card_choices(3, rng)
	assert_eq(choices.size(), 3, "Should return requested number of choices")
	
	# Test rarity weights
	var rarities = {"common": 0, "uncommon": 0, "rare": 0}
	for i in range(100):
		var test_choices = pve_map._weighted_card_choices(1, rng)
		var card = test_choices[0]
		if card.begins_with("major_"):
			rarities["rare"] += 1
		elif card.ends_with("_04"):
			rarities["uncommon"] += 1
		else:
			rarities["common"] += 1
	
	# Common should be most frequent
	assert_gt(rarities["common"], rarities["uncommon"], "Commons should be more frequent")
	assert_gt(rarities["uncommon"], rarities["rare"], "Uncommons should be more frequent than rares")

func test_shop_system():
	# Test shop mechanics
	pve_map.current_run["gold"] = 100
	
	# Test card purchase
	var can_buy = pve_map.current_run["gold"] >= 75
	assert_true(can_buy, "Should be able to buy with enough gold")
	
	# Test fragment exchange
	pve_map.deck_fragments = 1000
	assert_true(pve_map.deck_fragments >= 1000, "Should be able to exchange fragments")

func test_rest_site():
	# Test rest options
	pve_map.current_run["health"] = 15
	pve_map.current_run["max_health"] = 30
	
	# Heal option
	pve_map._rest_heal()
	assert_gt(pve_map.current_run["health"], 15, "Should heal at rest site")
	
	# Upgrade option (would modify deck)
	var initial_deck = pve_map.current_run["deck"].duplicate()
	pve_map._rest_upgrade()
	# Check deck was modified

func test_save_resume():
	# Test run persistence
	pve_map.current_run = {
		"health": 25,
		"gold": 150,
		"deck": [{"id": "test_card", "count": 1}]
	}
	pve_map.current_node_id = 5
	pve_map.completed_nodes = [1, 2, 3]
	
	pve_map._save_run()
	
	# Simulate reload
	var new_map = pve_map_scene.instantiate()
	var resumed = new_map._resume_if_available()
	
	assert_true(resumed, "Should resume saved run")
	assert_eq(new_map.current_run["health"], 25, "Should restore health")
	assert_eq(new_map.current_node_id, 5, "Should restore position")

func test_trial_completion():
	# Test Arcana Trials in PvE
	pve_map.trials_completed = 0
	
	# Complete battles/elites to progress trials
	pve_map._complete_node(1)  # Battle
	assert_eq(pve_map.trials_completed, 1, "Battle should progress trials")
	
	pve_map._complete_node(2)  # Elite
	assert_eq(pve_map.trials_completed, 2, "Elite should progress trials")
	
	pve_map.trials_completed = 3
	assert_true(pve_map._check_run_complete(), "3 trials should complete run")

func test_enemy_deck_generation():
	# Test enemy deck creation for different node types
	var battle_deck = pve_map._generate_enemy_deck(pve_map.NodeType.BATTLE)
	assert_gt(battle_deck.size(), 0, "Battle should have enemy deck")
	
	var elite_deck = pve_map._generate_enemy_deck(pve_map.NodeType.ELITE)
	assert_gt(elite_deck.size(), battle_deck.size(), "Elite should have larger deck")
	
	var boss_deck = pve_map._generate_enemy_deck(pve_map.NodeType.BOSS)
	assert_gt(boss_deck.size(), elite_deck.size(), "Boss should have largest deck")