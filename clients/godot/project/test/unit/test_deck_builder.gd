extends GutTest

# Test the Deck Builder
class_name TestDeckBuilder

var deck_builder_scene = preload("res://scenes/DeckBuilder.tscn")
var deck_builder: Control

func before_each():
	deck_builder = deck_builder_scene.instantiate()
	add_child(deck_builder)

func after_each():
	deck_builder.queue_free()

func test_deck_constraints():
	# Test 30-40 card limit
	assert_eq(deck_builder.MIN_CARDS, 30, "Minimum should be 30 cards")
	assert_eq(deck_builder.MAX_CARDS, 40, "Maximum should be 40 cards")
	
	# Test adding cards up to limit
	for i in range(30):
		deck_builder.current_deck["slot_%d" % i] = "wands_%02d" % (i % 14 + 1)
	
	assert_true(deck_builder._validate_deck(), "30 cards should be valid")
	
	# Test exceeding limit
	for i in range(30, 41):
		deck_builder.current_deck["slot_%d" % i] = "cups_%02d" % (i % 14 + 1)
	
	assert_false(deck_builder._validate_deck(), "41 cards should be invalid")

func test_major_arcana_limit():
	# Test max 2 Major Arcana
	assert_eq(deck_builder.MAX_MAJOR_ARCANA, 2, "Should allow max 2 Major Arcana")
	
	deck_builder.current_deck = {
		"major_slot_0": "major_00",
		"major_slot_1": "major_01"
	}
	
	var can_add_third = deck_builder._can_add_card("major_02")
	assert_false(can_add_third, "Should not allow third Major Arcana")
	
	var major_count = deck_builder._count_major_arcana_in_deck()
	assert_eq(major_count, 2, "Should count Major Arcana correctly")

func test_minor_copies_limit():
	# Test max 2 copies of minor arcana
	assert_eq(deck_builder.MAX_COPIES_MINOR, 2, "Should allow max 2 copies of minors")
	
	deck_builder.current_deck = {
		"slot_0": "wands_01",
		"slot_1": "wands_01"
	}
	
	var copies = deck_builder._count_card_in_deck("wands_01")
	assert_eq(copies, 2, "Should count copies correctly")
	
	var can_add_third = deck_builder._can_add_card("wands_01")
	assert_false(can_add_third, "Should not allow third copy")

func test_synergy_calculation():
	# Test suit balance synergy
	deck_builder.deck_stats = {
		"total_cards": 32,
		"major_count": 2,
		"wands_count": 7,
		"cups_count": 8,
		"swords_count": 7,
		"pentacles_count": 8
	}
	
	deck_builder._calculate_synergy()
	
	# Well-balanced deck should have high synergy
	assert_gt(deck_builder.deck_stats["synergy_score"], 80.0, "Balanced deck should have high synergy")
	
	# Unbalanced deck
	deck_builder.deck_stats["wands_count"] = 20
	deck_builder.deck_stats["cups_count"] = 5
	deck_builder.deck_stats["swords_count"] = 3
	deck_builder.deck_stats["pentacles_count"] = 2
	
	deck_builder._calculate_synergy()
	assert_lt(deck_builder.deck_stats["synergy_score"], 50.0, "Unbalanced deck should have low synergy")

func test_deck_validation():
	# Test validation messages
	deck_builder.deck_stats["total_cards"] = 25
	var valid = deck_builder._validate_deck()
	assert_false(valid, "Should be invalid with too few cards")
	
	deck_builder.deck_stats["total_cards"] = 35
	deck_builder.deck_stats["major_count"] = 3
	valid = deck_builder._validate_deck()
	assert_false(valid, "Should be invalid with too many Major Arcana")
	
	deck_builder.deck_stats["total_cards"] = 35
	deck_builder.deck_stats["major_count"] = 2
	valid = deck_builder._validate_deck()
	assert_true(valid, "Should be valid with correct constraints")

func test_auto_complete():
	# Test auto-complete to minimum cards
	deck_builder.deck_stats["total_cards"] = 20
	deck_builder.available_cards = {
		"wands_03": true,
		"cups_03": true,
		"swords_03": true,
		"pentacles_03": true
	}
	
	deck_builder._auto_complete_deck()
	
	assert_ge(deck_builder.current_deck.size(), 30, "Should auto-complete to minimum")

func test_save_deck():
	# Test deck saving
	deck_builder.deck_name = "Test Deck"
	deck_builder.base_deck_art = "classic"
	
	for i in range(30):
		deck_builder.current_deck["slot_%d" % i] = "wands_%02d" % (i % 14 + 1)
	
	deck_builder._save_deck()
	
	var saved_decks = ProjectSettings.get_setting("tarot/user_decks", {})
	assert_has(saved_decks, "Test Deck", "Should save deck with name")
	
	var saved_deck = saved_decks["Test Deck"]
	assert_eq(saved_deck["cards"].size(), 30, "Should save all cards")
	assert_eq(saved_deck["base_art"], "classic", "Should save base art")

func test_card_drag_drop():
	# Test drag and drop functionality
	var card = Control.new()
	card.set_meta("card_id", "wands_01")
	
	var slot = Panel.new()
	slot.set_meta("is_slot", true)
	slot.set_meta("card_id", "")
	slot.name = "minor_slot_0"
	
	# Simulate drag
	deck_builder.selected_card = "wands_01"
	
	# Simulate drop
	deck_builder._add_card_to_slot("wands_01", slot)
	
	assert_eq(slot.get_meta("card_id"), "wands_01", "Card should be added to slot")
	assert_has(deck_builder.current_deck, "minor_slot_0", "Deck should track card")

func test_slot_organization():
	# Test major/minor slot separation
	deck_builder._create_deck_slots()
	
	var major_slot_count = deck_builder.major_slots.get_child_count()
	assert_eq(major_slot_count, deck_builder.MAX_MAJOR_ARCANA, "Should have correct major slots")
	
	var minor_slot_count = deck_builder.minor_slots.get_child_count()
	var expected_minor = deck_builder.MAX_CARDS - deck_builder.MAX_MAJOR_ARCANA
	assert_eq(minor_slot_count, expected_minor, "Should have correct minor slots")

func test_deck_statistics():
	# Test statistics tracking
	deck_builder.current_deck = {
		"slot_0": "major_00",
		"slot_1": "wands_01",
		"slot_2": "wands_02",
		"slot_3": "cups_01",
		"slot_4": "swords_01",
		"slot_5": "pentacles_01"
	}
	
	deck_builder._update_statistics()
	
	assert_eq(deck_builder.deck_stats["total_cards"], 6, "Should count total cards")
	assert_eq(deck_builder.deck_stats["major_count"], 1, "Should count Major Arcana")
	assert_eq(deck_builder.deck_stats["wands_count"], 2, "Should count Wands")
	assert_eq(deck_builder.deck_stats["cups_count"], 1, "Should count Cups")
	assert_eq(deck_builder.deck_stats["swords_count"], 1, "Should count Swords")
	assert_eq(deck_builder.deck_stats["pentacles_count"], 1, "Should count Pentacles")

func test_clear_deck():
	# Test clearing all cards
	deck_builder.current_deck = {
		"slot_0": "major_00",
		"slot_1": "wands_01",
		"slot_2": "cups_01"
	}
	
	deck_builder._clear_deck()
	
	assert_eq(deck_builder.current_deck.size(), 0, "Should clear all cards")
	assert_eq(deck_builder.deck_stats["total_cards"], 0, "Should reset statistics")