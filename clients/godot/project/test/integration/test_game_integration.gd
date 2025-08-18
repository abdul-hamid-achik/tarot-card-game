extends GutTest

# Integration tests for complete game flow
class_name TestGameIntegration

func test_full_pvp_match_flow():
	# Test complete PvP match from menu to victory
	
	# 1. Start from menu
	var menu = load("res://scenes/Menu.tscn").instantiate()
	add_child(menu)
	
	# 2. Navigate to deck selection
	menu._on_pvp_pressed()
	yield(get_tree().create_timer(0.1), "timeout")
	
	# 3. Select deck
	var deck_select = get_tree().get_nodes_in_group("deck_select")[0]
	assert_not_null(deck_select, "Should load deck select screen")
	deck_select._select_deck("classic")
	
	# 4. Start matchmaking
	deck_select._start_matchmaking()
	yield(get_tree().create_timer(0.1), "timeout")
	
	# 5. Load game board
	var game_board = get_tree().get_nodes_in_group("game_board")[0]
	assert_not_null(game_board, "Should load game board")
	
	# 6. Test game mechanics
	assert_eq(game_board.player_health, 30, "Should start with 30 health")
	assert_eq(game_board.player_fate, 0, "Should start with 0 fate")
	
	# 7. Simulate turns
	for i in range(3):
		game_board._draw_card_to_hand(true)
		if game_board.player_hand_container.get_child_count() > 0:
			var card = game_board.player_hand_container.get_child(0)
			game_board._play_card(card)
		game_board._end_turn()
		yield(get_tree().create_timer(0.1), "timeout")
	
	# 8. Check victory conditions
	game_board.arcana_trials = {"sun": 100, "moon": 100, "judgement": 100}
	var victory = game_board._check_trials_victory()
	assert_true(victory, "Should detect victory with 3 trials")
	
	# Cleanup
	menu.queue_free()

func test_full_pve_run():
	# Test complete PvE run through regions
	
	# 1. Start PvE from menu
	var menu = load("res://scenes/Menu.tscn").instantiate()
	add_child(menu)
	menu._on_pve_pressed()
	yield(get_tree().create_timer(0.1), "timeout")
	
	# 2. Load PvE map
	var pve_map = get_tree().get_nodes_in_group("pve_map")[0]
	assert_not_null(pve_map, "Should load PvE map")
	
	# 3. Initialize run
	pve_map._initialize_run()
	assert_has(pve_map.current_run, "deck", "Should have starting deck")
	
	# 4. Navigate through nodes
	var start_node = 0
	pve_map._on_node_clicked(start_node)
	
	# 5. Handle different node types
	var node_type = pve_map.map_data[start_node]["type"]
	match node_type:
		pve_map.NodeType.BATTLE:
			# Start battle
			yield(get_tree().create_timer(0.1), "timeout")
			var battle = get_tree().get_nodes_in_group("game_board")[0]
			assert_not_null(battle, "Should load battle")
			
		pve_map.NodeType.EVENT:
			# Handle event
			assert_true(pve_map.event_popup.visible, "Should show event popup")
			pve_map._on_event_choice(0)  # Choose first option
			
		pve_map.NodeType.SHOP:
			# Visit shop
			assert_true(pve_map.shop_popup.visible, "Should show shop")
			if pve_map.current_run["gold"] >= 75:
				pve_map._on_shop_buy("wands_01")
	
	# 6. Progress through regions
	pve_map.current_region = 1
	pve_map._complete_region()
	assert_ge(pve_map.deck_fragments, 330, "Should accumulate fragments")
	
	# 7. Unlock deck with fragments
	pve_map.deck_fragments = 1000
	pve_map._unlock_full_deck("marigold")
	assert_eq(pve_map.deck_fragments, 0, "Should consume fragments")
	
	# Cleanup
	menu.queue_free()

func test_deck_building_flow():
	# Test complete deck building process
	
	# 1. Open deck builder
	var deck_builder = load("res://scenes/DeckBuilder.tscn").instantiate()
	add_child(deck_builder)
	
	# 2. Load available cards
	deck_builder._load_owned_cards()
	assert_gt(deck_builder.available_cards.size(), 0, "Should have cards available")
	
	# 3. Add cards to deck
	var test_deck = [
		"major_00", "major_01"  # 2 Major Arcana (max)
	]
	
	# Add 28 minor arcana to reach minimum
	for i in range(28):
		var suit = ["wands", "cups", "swords", "pentacles"][i % 4]
		var number = (i % 14) + 1
		test_deck.append("%s_%02d" % [suit, number])
	
	# 4. Add cards to slots
	for i in range(test_deck.size()):
		var card_id = test_deck[i]
		var is_major = card_id.begins_with("major_")
		var slot_name = "major_slot_%d" % i if is_major else "minor_slot_%d" % i
		deck_builder.current_deck[slot_name] = card_id
	
	# 5. Update and validate
	deck_builder._update_statistics()
	assert_eq(deck_builder.deck_stats["total_cards"], 30, "Should have 30 cards")
	assert_eq(deck_builder.deck_stats["major_count"], 2, "Should have 2 Major Arcana")
	
	var valid = deck_builder._validate_deck()
	assert_true(valid, "Deck should be valid")
	
	# 6. Calculate synergy
	deck_builder._calculate_synergy()
	assert_gt(deck_builder.deck_stats["synergy_score"], 0, "Should have synergy score")
	
	# 7. Save deck
	deck_builder.deck_name = "Integration Test Deck"
	deck_builder._save_deck()
	
	var saved = ProjectSettings.get_setting("tarot/user_decks", {})
	assert_has(saved, "Integration Test Deck", "Should save deck")
	
	# Cleanup
	deck_builder.queue_free()

func test_collection_progression():
	# Test collection and unlock flow
	
	# 1. Open collection
	var collection = load("res://scenes/Collection.tscn").instantiate()
	add_child(collection)
	
	# 2. Check initial state
	collection._load_collection_data()
	assert_has(collection.owned_decks, "classic", "Should have starter deck")
	
	# 3. Simulate card unlocks from PvE
	var new_cards = ["major_05", "wands_10", "cups_08", "swords_12"]
	collection.unlock_cards_for_deck("marigold", new_cards)
	
	# 4. Check progression
	var progress = collection.deck_progress["marigold"]
	assert_has(progress, "unlocked_list", "Should track unlocked cards")
	assert_eq(progress["unlocked_list"].size(), 4, "Should have 4 cards")
	
	# 5. Test filtering
	collection.filter_mode = "partial"
	var filtered = collection._get_filtered_decks()
	assert_has(filtered, "marigold", "Should show partial deck")
	
	# 6. Test gallery view
	collection.selected_deck = "marigold"
	collection._show_gallery()
	assert_true(collection.gallery_view.visible, "Should show gallery")
	
	# 7. Test fragment exchange
	collection.deck_fragments = 1000
	assert_true(collection._can_exchange_fragments(), "Should be able to exchange")
	
	# Cleanup
	collection.queue_free()

func test_websocket_communication():
	# Test client-server WebSocket communication
	
	var game_board = load("res://scenes/GameBoard.tscn").instantiate()
	add_child(game_board)
	
	# 1. Connect to server
	game_board._connect_to_server()
	yield(get_tree().create_timer(0.5), "timeout")
	
	if game_board.ws_client.get_ready_state() == WebSocketClient.STATE_OPEN:
		assert_true(true, "Connected to server")
		
		# 2. Send queue request
		game_board._send({
			"type": "queue",
			"deck": ["major_00", "wands_01", "cups_01"]
		})
		
		# 3. Wait for match
		yield(get_tree().create_timer(1.0), "timeout")
		
		# 4. Send ready
		game_board._send({"type": "ready"})
		
		# 5. Test game actions
		game_board._send({
			"type": "intent",
			"intent": {
				"type": "play_card",
				"cardId": "wands_01"
			}
		})
		
		# 6. Test fate action
		game_board._send({
			"type": "intent",
			"intent": {
				"type": "peek"
			}
		})
		
		# 7. Disconnect gracefully
		game_board.ws_client.disconnect_from_host()
	else:
		assert_true(false, "Could not connect to server")
	
	# Cleanup
	game_board.queue_free()

func test_animation_sequences():
	# Test animation timing and sequences
	
	var game_board = load("res://scenes/GameBoard.tscn").instantiate()
	add_child(game_board)
	
	# 1. Test card draw animation
	var card = game_board._create_card("test_card")
	game_board._animate_card_draw(card, true)
	yield(get_tree().create_timer(game_board.CARD_DRAW_DURATION), "timeout")
	assert_not_null(card.get_parent(), "Card should be in hand after draw")
	
	# 2. Test card play animation
	game_board._animate_card_play(card, Vector2(400, 300))
	yield(get_tree().create_timer(game_board.CARD_PLAY_DURATION), "timeout")
	
	# 3. Test flip animation
	card.set_meta("orientation", "upright")
	game_board._animate_card_flip(card)
	yield(get_tree().create_timer(game_board.FLIP_DURATION), "timeout")
	assert_eq(card.get_meta("orientation"), "reversed", "Should flip orientation")
	
	# 4. Test channeling pulse
	game_board._animate_channeling_pulse(card)
	yield(get_tree().create_timer(game_board.CHANNEL_PULSE_DURATION), "timeout")
	
	# 5. Test fate particles
	game_board._show_fate_particles(true)
	assert_true(game_board.fate_particles.emitting, "Should emit particles")
	
	# Cleanup
	card.queue_free()
	game_board.queue_free()

func test_save_load_persistence():
	# Test save/load functionality across scenes
	
	# 1. Save game state
	var test_data = {
		"player_deck": "classic",
		"owned_decks": {"classic": true, "marigold": true},
		"deck_progress": {"marigold": {"completion": 50.0}},
		"pve_run": {"health": 25, "gold": 150}
	}
	
	for key in test_data:
		ProjectSettings.set_setting("tarot/" + key, test_data[key])
	ProjectSettings.save()
	
	# 2. Load in new scene
	var collection = load("res://scenes/Collection.tscn").instantiate()
	add_child(collection)
	collection._load_collection_data()
	
	assert_eq(collection.owned_decks["marigold"], true, "Should load owned decks")
	assert_eq(collection.deck_progress["marigold"]["completion"], 50.0, "Should load progress")
	
	# 3. Load PvE run
	var pve_map = load("res://scenes/PvEMap.tscn").instantiate()
	add_child(pve_map)
	var resumed = pve_map._resume_if_available()
	
	if resumed:
		assert_eq(pve_map.current_run["health"], 25, "Should restore health")
		assert_eq(pve_map.current_run["gold"], 150, "Should restore gold")
	
	# Cleanup
	collection.queue_free()
	pve_map.queue_free()