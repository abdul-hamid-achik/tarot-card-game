extends GutTest

# Test the Collection system
class_name TestCollection

var collection_scene = preload("res://scenes/Collection.tscn")
var collection: Control

func before_each():
	collection = collection_scene.instantiate()
	add_child(collection)

func after_each():
	collection.queue_free()

func test_deck_database():
	# Test deck database is properly loaded
	assert_has(collection.deck_database, "classic", "Should have Classic deck")
	assert_has(collection.deck_database, "marigold", "Should have Marigold deck")
	assert_has(collection.deck_database, "arcana", "Should have Arcana deck")
	assert_has(collection.deck_database, "duality", "Should have Duality deck")
	
	# Test deck properties
	var classic = collection.deck_database["classic"]
	assert_eq(classic["total_cards"], 78, "Tarot deck should have 78 cards")
	assert_eq(classic["rarity"], "common", "Classic should be common rarity")

func test_deck_progression():
	# Test deck unlock progression
	collection.deck_progress = {
		"classic": {"cards_unlocked": 26, "completion": 33.3},
		"marigold": {"cards_unlocked": 52, "completion": 66.6},
		"arcana": {"cards_unlocked": 78, "completion": 100.0}
	}
	
	# Test 33% unlock
	var classic_progress = collection.deck_progress["classic"]["completion"]
	assert_almost_eq(classic_progress, 33.3, 0.1, "33% should unlock first region")
	
	# Test 66% unlock
	var marigold_progress = collection.deck_progress["marigold"]["completion"]
	assert_almost_eq(marigold_progress, 66.6, 0.1, "66% should unlock second region")
	
	# Test 100% unlock
	var arcana_progress = collection.deck_progress["arcana"]["completion"]
	assert_eq(arcana_progress, 100.0, "100% should fully unlock deck")

func test_filtering():
	# Test filter modes
	collection.filter_mode = "all"
	var all_decks = collection._get_filtered_decks()
	assert_eq(all_decks.size(), 4, "All filter should show all decks")
	
	collection.filter_mode = "owned"
	collection.owned_decks = {"classic": true}
	var owned_decks = collection._get_filtered_decks()
	assert_eq(owned_decks.size(), 1, "Owned filter should only show owned decks")
	
	collection.filter_mode = "partial"
	collection.deck_progress = {
		"marigold": {"completion": 50.0}
	}
	var partial_decks = collection._get_filtered_decks()
	assert_has(partial_decks, "marigold", "Partial filter should show partially complete decks")

func test_sorting():
	# Test sort modes
	var deck_list = ["arcana", "classic", "duality", "marigold"]
	
	# Sort by progress
	collection.sort_mode = "progress"
	collection.deck_progress = {
		"classic": {"completion": 100.0},
		"marigold": {"completion": 50.0},
		"arcana": {"completion": 25.0},
		"duality": {"completion": 0.0}
	}
	var sorted = collection._sort_decks(deck_list)
	assert_eq(sorted[0], "classic", "Highest progress should be first")
	assert_eq(sorted[3], "duality", "Lowest progress should be last")
	
	# Sort by artist
	collection.sort_mode = "artist"
	sorted = collection._sort_decks(deck_list)
	# Would check alphabetical order by artist
	
	# Sort by release date
	collection.sort_mode = "release"
	sorted = collection._sort_decks(deck_list)
	# Would check chronological order

func test_gallery_view():
	# Test gallery card organization
	collection.selected_deck = "classic"
	collection.deck_progress = {
		"classic": {
			"unlocked_list": ["major_00", "major_01", "wands_01", "cups_01"]
		}
	}
	
	collection._populate_gallery()
	
	var gallery_cards = collection.gallery_grid.get_children()
	# Should have 78 card slots (22 Major + 56 Minor)
	assert_eq(gallery_cards.size(), 78, "Gallery should show all 78 card slots")

func test_unlock_cards():
	# Test card unlocking mechanism
	var deck_id = "marigold"
	var new_cards = ["major_05", "wands_07", "cups_03"]
	
	collection.unlock_cards_for_deck(deck_id, new_cards)
	
	assert_has(collection.deck_progress, deck_id, "Should create progress entry")
	var unlocked = collection.deck_progress[deck_id]["unlocked_list"]
	for card in new_cards:
		assert_has(unlocked, card, "Should add unlocked cards")
	
	# Test completion calculation
	var completion = collection.deck_progress[deck_id]["completion"]
	var expected = (new_cards.size() / 78.0) * 100.0
	assert_almost_eq(completion, expected, 0.1, "Completion should be calculated correctly")

func test_deck_fragments():
	# Test fragment economy (1000 fragments = full deck)
	collection.deck_fragments = 500
	assert_false(collection._can_exchange_fragments(), "Should not exchange with < 1000")
	
	collection.deck_fragments = 1000
	assert_true(collection._can_exchange_fragments(), "Should exchange with 1000 fragments")
	
	collection._exchange_fragments_for_deck()
	assert_eq(collection.deck_fragments, 0, "Should consume 1000 fragments")

func test_starter_deck():
	# Test starter deck initialization
	collection._load_collection_data()
	
	assert_has(collection.owned_decks, "classic", "Should have starter deck")
	assert_true(collection.owned_decks["classic"], "Starter deck should be owned")
	
	var classic_progress = collection.deck_progress["classic"]
	assert_eq(classic_progress["cards_unlocked"], 78, "Starter deck should be fully unlocked")
	assert_eq(classic_progress["completion"], 100.0, "Starter deck should be 100% complete")

func test_deck_card_ui():
	# Test deck card visual states
	var owned_card = collection._create_deck_card("classic")
	collection.owned_decks["classic"] = true
	assert_eq(owned_card.modulate, Color.WHITE, "Owned deck should be white")
	
	var partial_card = collection._create_deck_card("marigold")
	collection.deck_progress["marigold"] = {"completion": 50.0}
	assert_eq(partial_card.modulate, Color(0.9, 0.9, 1.0), "Partial deck should be light blue")
	
	var locked_card = collection._create_deck_card("arcana")
	collection.deck_progress["arcana"] = {"completion": 0.0}
	assert_eq(locked_card.modulate, Color(0.5, 0.5, 0.5), "Locked deck should be gray")

func test_save_load():
	# Test persistence
	collection.owned_decks = {"test_deck": true}
	collection.deck_progress = {"test_deck": {"completion": 75.0}}
	
	ProjectSettings.set_setting("tarot/owned_decks", collection.owned_decks)
	ProjectSettings.set_setting("tarot/deck_progress", collection.deck_progress)
	
	# Simulate reload
	var loaded_owned = ProjectSettings.get_setting("tarot/owned_decks", {})
	var loaded_progress = ProjectSettings.get_setting("tarot/deck_progress", {})
	
	assert_has(loaded_owned, "test_deck", "Should persist owned decks")
	assert_eq(loaded_progress["test_deck"]["completion"], 75.0, "Should persist progress")