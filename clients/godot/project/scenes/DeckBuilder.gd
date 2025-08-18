extends Control

# Deck building state
var current_deck := {}
var deck_name := "My Deck"
var base_deck_art := "classic"
var available_cards := {}
var selected_card := ""

# Deck constraints
const MIN_CARDS := 30
const MAX_CARDS := 40
const MAX_MAJOR_ARCANA := 2
const MAX_COPIES_MINOR := 2

# Statistics
var deck_stats := {
	"total_cards": 0,
	"major_count": 0,
	"wands_count": 0,
	"cups_count": 0,
	"swords_count": 0,
	"pentacles_count": 0,
	"avg_cost": 0.0,
	"synergy_score": 0.0
}

# UI References
@onready var back_button := $Back
@onready var save_button := $TopBar/SaveButton
@onready var deck_name_input := $TopBar/DeckNameInput
@onready var collection_panel := $LeftPanel
@onready var collection_scroll := $LeftPanel/ScrollContainer
@onready var collection_grid := $LeftPanel/ScrollContainer/CollectionGrid
@onready var deck_panel := $CenterPanel
@onready var deck_slots := $CenterPanel/DeckSlots
@onready var major_slots := $CenterPanel/DeckSlots/MajorSection
@onready var minor_slots := $CenterPanel/DeckSlots/MinorSection
@onready var stats_panel := $RightPanel
@onready var card_count_label := $RightPanel/CardCount
@onready var suit_distribution := $RightPanel/SuitDistribution
@onready var mana_curve := $RightPanel/ManaCurve
@onready var synergy_label := $RightPanel/SynergyScore
@onready var suggestions_list := $RightPanel/Suggestions
@onready var auto_complete_button := $RightPanel/AutoCompleteButton
@onready var clear_deck_button := $RightPanel/ClearDeckButton
@onready var validation_label := $CenterPanel/ValidationLabel

func _ready() -> void:
	if back_button and not back_button.pressed.is_connected(_back):
		back_button.pressed.connect(_back)
	_load_owned_cards()
	_setup_ui()
	_create_deck_slots()
	_populate_collection()
	_connect_signals()
	_update_statistics()

func _load_owned_cards() -> void:
	# Load cards from collection
	var deck_progress = ProjectSettings.get_setting("tarot/deck_progress", {})
	for deck_id in deck_progress:
		var progress_data = deck_progress[deck_id]
		var unlocked_list = progress_data.get("unlocked_list", [])
		for card_id in unlocked_list:
			available_cards[card_id] = true

func _setup_ui() -> void:
	if deck_name_input:
		deck_name_input.text = deck_name
		deck_name_input.text_changed.connect(_on_deck_name_changed)
	if save_button:
		save_button.pressed.connect(_save_deck)
	if auto_complete_button:
		auto_complete_button.pressed.connect(_auto_complete_deck)
	if clear_deck_button:
		clear_deck_button.pressed.connect(_clear_deck)

func _create_deck_slots() -> void:
	# Create major arcana slots (2)
	for i in range(MAX_MAJOR_ARCANA):
		var slot := _create_card_slot("major_slot_" + str(i))
		major_slots.add_child(slot)
	
	# Create minor arcana slots (38 max)
	for i in range(MAX_CARDS - MAX_MAJOR_ARCANA):
		var slot := _create_card_slot("minor_slot_" + str(i))
		minor_slots.add_child(slot)

func _create_card_slot(slot_name: String) -> Panel:
	var slot := Panel.new()
	slot.name = slot_name
	slot.custom_minimum_size = Vector2(80, 112)
	slot.set_meta("is_slot", true)
	slot.set_meta("card_id", "")
	
	# Visual placeholder
	var label := Label.new()
	label.text = "+"
	label.anchor_right = 1.0
	label.anchor_bottom = 1.0
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.modulate = Color(0.5, 0.5, 0.5)
	slot.add_child(label)
	
	# Drop detection
	slot.gui_input.connect(_on_slot_input.bind(slot))
	
	return slot

func _populate_collection() -> void:
	# Clear existing
	for child in collection_grid.get_children():
		child.queue_free()
	
	# Add available cards
	var sorted_cards := available_cards.keys()
	sorted_cards.sort()
	
	for card_id in sorted_cards:
		var card_item := _create_collection_card(card_id)
		collection_grid.add_child(card_item)

func _create_collection_card(card_id: String) -> Control:
	var card := TextureRect.new()
	card.name = card_id
	card.custom_minimum_size = Vector2(60, 84)
	card.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	card.tooltip_text = card_id
	card.set_meta("card_id", card_id)
	
	# Check how many copies are in deck
	var copies := _count_card_in_deck(card_id)
	var is_major := card_id.begins_with("major_")
	var max_copies := MAX_MAJOR_ARCANA if is_major else MAX_COPIES_MINOR
	
	if copies >= max_copies:
		card.modulate = Color(0.5, 0.5, 0.5)  # Grayed out
	
	# Drag and drop
	card.gui_input.connect(_on_collection_card_input.bind(card))
	
	# Copy counter
	if copies > 0:
		var counter := Label.new()
		counter.text = str(copies) + "/" + str(max_copies)
		counter.anchor_left = 0.6
		counter.anchor_right = 1.0
		counter.anchor_top = 0.8
		counter.anchor_bottom = 1.0
		counter.add_theme_font_size_override("font_size", 10)
		card.add_child(counter)
	
	return card

func _on_collection_card_input(event: InputEvent, card: Control) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				# Start drag
				selected_card = card.get_meta("card_id")
			elif event.double_click:
				# Quick add to deck
				_add_card_to_deck(selected_card)

func _on_slot_input(event: InputEvent, slot: Panel) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
			# Drop card
			if selected_card != "":
				_add_card_to_slot(selected_card, slot)
				selected_card = ""
		elif event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			# Remove card from slot
			_remove_card_from_slot(slot)

func _add_card_to_deck(card_id: String) -> void:
	if not _can_add_card(card_id):
		return
	
	# Find empty slot
	var is_major := card_id.begins_with("major_")
	var slots_parent := major_slots if is_major else minor_slots
	
	for slot in slots_parent.get_children():
		if slot.get_meta("card_id") == "":
			_add_card_to_slot(card_id, slot)
			break

func _add_card_to_slot(card_id: String, slot: Panel) -> void:
	if not _can_add_card(card_id):
		return
	
	# Check if slot is appropriate
	var is_major := card_id.begins_with("major_")
	var is_major_slot := slot.name.begins_with("major_")
	
	if is_major != is_major_slot:
		return
	
	# Clear slot first
	_remove_card_from_slot(slot)
	
	# Add card
	slot.set_meta("card_id", card_id)
	current_deck[slot.name] = card_id
	
	# Update visual
	for child in slot.get_children():
		child.queue_free()
	
	var card_visual := TextureRect.new()
	card_visual.anchor_right = 1.0
	card_visual.anchor_bottom = 1.0
	card_visual.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	slot.add_child(card_visual)
	
	_update_statistics()
	_populate_collection()  # Refresh to update counters

func _remove_card_from_slot(slot: Panel) -> void:
	var card_id := slot.get_meta("card_id")
	if card_id == "":
		return
	
	slot.set_meta("card_id", "")
	current_deck.erase(slot.name)
	
	# Reset visual
	for child in slot.get_children():
		child.queue_free()
	
	var label := Label.new()
	label.text = "+"
	label.anchor_right = 1.0
	label.anchor_bottom = 1.0
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.modulate = Color(0.5, 0.5, 0.5)
	slot.add_child(label)
	
	_update_statistics()
	_populate_collection()

func _can_add_card(card_id: String) -> bool:
	var copies := _count_card_in_deck(card_id)
	var is_major := card_id.begins_with("major_")
	
	if is_major:
		var major_count := _count_major_arcana_in_deck()
		if major_count >= MAX_MAJOR_ARCANA:
			return false
	else:
		if copies >= MAX_COPIES_MINOR:
			return false
	
	if current_deck.size() >= MAX_CARDS:
		return false
	
	return true

func _count_card_in_deck(card_id: String) -> int:
	var count := 0
	for slot_name in current_deck:
		if current_deck[slot_name] == card_id:
			count += 1
	return count

func _count_major_arcana_in_deck() -> int:
	var count := 0
	for slot_name in current_deck:
		if current_deck[slot_name].begins_with("major_"):
			count += 1
	return count

func _update_statistics() -> void:
	# Count cards
	deck_stats["total_cards"] = current_deck.size()
	deck_stats["major_count"] = 0
	deck_stats["wands_count"] = 0
	deck_stats["cups_count"] = 0
	deck_stats["swords_count"] = 0
	deck_stats["pentacles_count"] = 0
	
	for slot_name in current_deck:
		var card_id := current_deck[slot_name]
		if card_id.begins_with("major_"):
			deck_stats["major_count"] += 1
		elif card_id.begins_with("wands_"):
			deck_stats["wands_count"] += 1
		elif card_id.begins_with("cups_"):
			deck_stats["cups_count"] += 1
		elif card_id.begins_with("swords_"):
			deck_stats["swords_count"] += 1
		elif card_id.begins_with("pentacles_"):
			deck_stats["pentacles_count"] += 1
	
	# Update UI
	if card_count_label:
		card_count_label.text = "Cards: %d/%d-%d" % [deck_stats["total_cards"], MIN_CARDS, MAX_CARDS]
	
	if suit_distribution:
		suit_distribution.text = "Suits:\n"
		suit_distribution.text += "Major: %d\n" % deck_stats["major_count"]
		suit_distribution.text += "Wands: %d\n" % deck_stats["wands_count"]
		suit_distribution.text += "Cups: %d\n" % deck_stats["cups_count"]
		suit_distribution.text += "Swords: %d\n" % deck_stats["swords_count"]
		suit_distribution.text += "Pentacles: %d" % deck_stats["pentacles_count"]
	
	# Calculate synergy
	_calculate_synergy()
	
	# Validate deck
	_validate_deck()

func _calculate_synergy() -> void:
	# Simple synergy calculation based on suit balance
	var total_minor := deck_stats["total_cards"] - deck_stats["major_count"]
	if total_minor == 0:
		deck_stats["synergy_score"] = 0.0
		return
	
	var balance_score := 100.0
	var suits := ["wands_count", "cups_count", "swords_count", "pentacles_count"]
	var ideal_per_suit := total_minor / 4.0
	
	for suit in suits:
		var diff := abs(deck_stats[suit] - ideal_per_suit)
		balance_score -= diff * 5
	
	deck_stats["synergy_score"] = max(0, balance_score)
	
	if synergy_label:
		synergy_label.text = "Synergy: %.0f%%" % deck_stats["synergy_score"]

func _validate_deck() -> bool:
	var valid := true
	var messages := []
	
	if deck_stats["total_cards"] < MIN_CARDS:
		messages.append("Need at least %d cards" % MIN_CARDS)
		valid = false
	elif deck_stats["total_cards"] > MAX_CARDS:
		messages.append("Maximum %d cards allowed" % MAX_CARDS)
		valid = false
	
	if deck_stats["major_count"] > MAX_MAJOR_ARCANA:
		messages.append("Maximum %d Major Arcana" % MAX_MAJOR_ARCANA)
		valid = false
	
	if validation_label:
		if valid:
			validation_label.text = "✓ Deck is valid"
			validation_label.modulate = Color.GREEN
		else:
			validation_label.text = "✗ " + ", ".join(messages)
			validation_label.modulate = Color.RED
	
	if save_button:
		save_button.disabled = not valid
	
	return valid

func _auto_complete_deck() -> void:
	# Auto-fill deck to minimum cards
	var needed := MIN_CARDS - deck_stats["total_cards"]
	if needed <= 0:
		return
	
	var available_minors := []
	for card_id in available_cards:
		if not card_id.begins_with("major_"):
			if _count_card_in_deck(card_id) < MAX_COPIES_MINOR:
				available_minors.append(card_id)
	
	available_minors.shuffle()
	
	for i in range(min(needed, available_minors.size())):
		_add_card_to_deck(available_minors[i])

func _clear_deck() -> void:
	current_deck.clear()
	
	# Reset all slots
	for slot in major_slots.get_children():
		_remove_card_from_slot(slot)
	for slot in minor_slots.get_children():
		_remove_card_from_slot(slot)
	
	_update_statistics()
	_populate_collection()

func _save_deck() -> void:
	if not _validate_deck():
		return
	
	# Convert deck to array format
	var deck_array := []
	for slot_name in current_deck:
		deck_array.append(current_deck[slot_name])
	
	# Save to user decks
	var user_decks = ProjectSettings.get_setting("tarot/user_decks", {})
	user_decks[deck_name] = {
		"cards": deck_array,
		"base_art": base_deck_art,
		"created": Time.get_unix_time_from_system()
	}
	ProjectSettings.set_setting("tarot/user_decks", user_decks)
	ProjectSettings.save()
	
	print("Deck saved: ", deck_name)
	_back()

func _on_deck_name_changed(new_name: String) -> void:
	deck_name = new_name if new_name != "" else "My Deck"

func _connect_signals() -> void:
	pass

func _back() -> void:
	var menu: PackedScene = load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu)