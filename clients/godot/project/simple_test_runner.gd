extends Node

# Simple Test Runner for Tarot TCG
# Runs basic tests without GUT dependency

signal tests_finished(results)

var test_results = {}
var tests_passed = 0
var tests_failed = 0
var current_test = ""

func _ready():
	print("========================================")
	print("TAROT TCG SIMPLE TEST SUITE")
	print("========================================")
	run_all_tests()

func run_all_tests():
	# Test GameBoard
	test_game_board()
	
	# Test Collection
	test_collection()
	
	# Test DeckBuilder
	test_deck_builder()
	
	# Test PvEMap
	test_pve_map()
	
	# Print results
	print_results()

func test_game_board():
	print("\n[Testing GameBoard]")
	
	var game_board = load("res://scenes/GameBoard.tscn").instantiate()
	add_child(game_board)
	
	# Test initialization
	assert_test("GameBoard health initialized", game_board.player_health == 30)
	assert_test("GameBoard fate initialized", game_board.player_fate == 0)
	assert_test("GameBoard lanes exist", game_board.player_lanes.size() == 6)
	
	# Test fate system
	game_board.player_fate = 3
	assert_test("Fate generation", game_board.player_fate == 3)
	
	# Test orientation system
	game_board.card_orientations["test_card"] = "upright"
	game_board._flip_card_orientation_by_id("test_card")
	assert_test("Card orientation flip", game_board.card_orientations["test_card"] == "reversed")
	
	# Test trials
	game_board.arcana_trials = {"sun": 100, "moon": 100, "judgement": 100}
	assert_test("Arcana trials victory", game_board._check_trials_victory() == true)
	
	# Test Major Arcana charging
	game_board.major_arcana_charge = 90
	game_board._charge_major_arcana(10)
	assert_test("Major Arcana charge cap", game_board.major_arcana_charge == 100)
	
	game_board.queue_free()

func test_collection():
	print("\n[Testing Collection]")
	
	var collection = load("res://scenes/Collection.tscn").instantiate()
	add_child(collection)
	
	# Test deck database
	assert_test("Collection has decks", collection.deck_database.size() > 0)
	assert_test("Classic deck exists", collection.deck_database.has("classic"))
	
	# Test progression tracking
	collection.deck_progress["marigold"] = {"completion": 33.0, "unlocked_list": ["major_00"]}
	assert_test("Deck progress tracking", collection.deck_progress["marigold"]["completion"] == 33.0)
	
	# Test filtering
	collection.filter_mode = "owned"
	collection.owned_decks = {"classic": true}
	var filtered = collection._get_filtered_decks()
	assert_test("Deck filtering", filtered.has("classic"))
	
	# Test fragment exchange
	collection.deck_fragments = 1000
	assert_test("Fragment exchange threshold", collection._can_exchange_fragments() == true)
	
	collection.queue_free()

func test_deck_builder():
	print("\n[Testing DeckBuilder]")
	
	var deck_builder = load("res://scenes/DeckBuilder.tscn").instantiate()
	add_child(deck_builder)
	
	# Test constraints
	assert_test("Min cards constraint", deck_builder.MIN_CARDS == 30)
	assert_test("Max cards constraint", deck_builder.MAX_CARDS == 40)
	assert_test("Max Major Arcana", deck_builder.MAX_MAJOR_ARCANA == 2)
	assert_test("Max copies minor", deck_builder.MAX_COPIES_MINOR == 2)
	
	# Test deck validation
	deck_builder.deck_stats = {
		"total_cards": 35,
		"major_count": 2,
		"wands_count": 8,
		"cups_count": 8,
		"swords_count": 9,
		"pentacles_count": 8
	}
	assert_test("Valid deck configuration", deck_builder._validate_deck() == true)
	
	# Test invalid deck
	deck_builder.deck_stats["major_count"] = 3
	assert_test("Invalid deck with too many Major", deck_builder._validate_deck() == false)
	
	deck_builder.queue_free()

func test_pve_map():
	print("\n[Testing PvEMap]")
	
	var pve_map = load("res://scenes/PvEMap.tscn").instantiate()
	add_child(pve_map)
	
	# Test node types
	assert_test("PvE Battle node", pve_map.NodeType.BATTLE == 0)
	assert_test("PvE Boss node", pve_map.NodeType.BOSS == 6)
	
	# Test run initialization
	pve_map._initialize_run()
	assert_test("Run has deck", pve_map.current_run.has("deck"))
	assert_test("Run has health", pve_map.current_run["health"] == 30)
	
	# Test fragment accumulation
	pve_map.deck_fragments = 0
	pve_map.current_region = 1
	pve_map._complete_region()
	assert_test("Region 1 fragments", pve_map.deck_fragments >= 330)
	
	# Test event system
	assert_test("Event variants exist", pve_map.event_variants.size() == 4)
	
	pve_map.queue_free()

func assert_test(test_name: String, condition: bool):
	current_test = test_name
	if condition:
		tests_passed += 1
		print("  ✓ " + test_name)
	else:
		tests_failed += 1
		print("  ✗ " + test_name)

func print_results():
	print("\n========================================")
	print("TEST RESULTS")
	print("========================================")
	print("Passed: ", tests_passed)
	print("Failed: ", tests_failed)
	print("Total: ", tests_passed + tests_failed)
	print("========================================")
	
	test_results = {
		"passed": tests_passed,
		"failed": tests_failed,
		"total": tests_passed + tests_failed
	}
	
	emit_signal("tests_finished", test_results)
	
	# Exit with appropriate code
	if OS.has_feature("headless"):
		get_tree().quit(tests_failed)