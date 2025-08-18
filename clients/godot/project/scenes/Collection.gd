extends Control

# Collection state
var owned_decks := {}
var deck_progress := {}
var selected_deck := ""
var filter_mode := "all"  # all, owned, partial, locked
var sort_mode := "progress"  # progress, artist, release

# Deck database
var deck_database := {
	"classic": {
		"name": "Classic Rider-Waite", 
		"artist": "Pamela Colman Smith",
		"theme": "Traditional",
		"total_cards": 78,
		"release_date": "1909",
		"rarity": "common"
	},
	"marigold": {
		"name": "Marigold Tarot",
		"artist": "Amrit Brar", 
		"theme": "Modern Mystical",
		"total_cards": 78,
		"release_date": "2021",
		"rarity": "uncommon"
	},
	"arcana": {
		"name": "Arcana Series",
		"artist": "Various Artists",
		"theme": "Fantasy Art",
		"total_cards": 78,
		"release_date": "2023",
		"rarity": "rare"
	},
	"duality": {
		"name": "Duality Collection",
		"artist": "Twin Vision Studio",
		"theme": "Light & Shadow",
		"total_cards": 78,
		"release_date": "2024",
		"rarity": "epic"
	}
}

# UI References
@onready var deck_grid := $ScrollContainer/DeckGrid
@onready var filter_buttons := $TopBar/FilterButtons
@onready var sort_dropdown := $TopBar/SortDropdown
@onready var deck_info_panel := $DeckInfoPanel
@onready var deck_name_label := $DeckInfoPanel/DeckName
@onready var deck_artist_label := $DeckInfoPanel/DeckArtist
@onready var deck_theme_label := $DeckInfoPanel/DeckTheme
@onready var completion_label := $DeckInfoPanel/CompletionLabel
@onready var progress_bar := $DeckInfoPanel/ProgressBar
@onready var deck_preview := $DeckInfoPanel/DeckPreview
@onready var view_gallery_button := $DeckInfoPanel/ViewGalleryButton
@onready var gallery_view := $GalleryView
@onready var gallery_grid := $GalleryView/ScrollContainer/CardGrid
@onready var back_button := $Back

func _ready() -> void:
	if back_button and not back_button.pressed.is_connected(_back):
		back_button.pressed.connect(_back)
	_load_collection_data()
	_setup_ui()
	_populate_deck_grid()
	_connect_signals()

func _load_collection_data() -> void:
	# Load from save data
	owned_decks = ProjectSettings.get_setting("tarot/owned_decks", {})
	deck_progress = ProjectSettings.get_setting("tarot/deck_progress", {})
	# Initialize starter deck as owned
	if owned_decks.is_empty():
		owned_decks["classic"] = true
		deck_progress["classic"] = {"cards_unlocked": 78, "completion": 100.0}
		ProjectSettings.set_setting("tarot/owned_decks", owned_decks)
		ProjectSettings.set_setting("tarot/deck_progress", deck_progress)
		ProjectSettings.save()

func _setup_ui() -> void:
	if filter_buttons:
		for button in filter_buttons.get_children():
			if button is Button:
				button.pressed.connect(_on_filter_changed.bind(button.name.to_lower()))
	if sort_dropdown and sort_dropdown is OptionButton:
		var opt := sort_dropdown as OptionButton
		opt.add_item("Sort by Progress")
		opt.add_item("Sort by Artist")
		opt.add_item("Sort by Release Date")
		opt.item_selected.connect(_on_sort_changed)
	if view_gallery_button:
		view_gallery_button.pressed.connect(_show_gallery)

func _populate_deck_grid() -> void:
	# Clear existing items
	for child in deck_grid.get_children():
		child.queue_free()
	
	# Get filtered and sorted deck list
	var deck_list := _get_filtered_decks()
	deck_list = _sort_decks(deck_list)
	
	# Create deck cards
	for deck_id in deck_list:
		var deck_card := _create_deck_card(deck_id)
		deck_grid.add_child(deck_card)

func _create_deck_card(deck_id: String) -> Control:
	var card := Panel.new()
	card.custom_minimum_size = Vector2(200, 280)
	card.name = deck_id
	
	var vbox := VBoxContainer.new()
	vbox.anchor_right = 1.0
	vbox.anchor_bottom = 1.0
	vbox.add_theme_constant_override("separation", 5)
	card.add_child(vbox)
	
	# Deck thumbnail
	var thumb := TextureRect.new()
	thumb.custom_minimum_size = Vector2(180, 180)
	thumb.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	vbox.add_child(thumb)
	
	# Deck name
	var name_label := Label.new()
	name_label.text = deck_database[deck_id]["name"]
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(name_label)
	
	# Progress bar
	var progress := ProgressBar.new()
	progress.custom_minimum_size = Vector2(0, 20)
	var completion := deck_progress.get(deck_id, {}).get("completion", 0.0)
	progress.value = completion
	vbox.add_child(progress)
	
	# Completion label
	var comp_label := Label.new()
	var cards_unlocked := deck_progress.get(deck_id, {}).get("cards_unlocked", 0)
	comp_label.text = "%d/78 Cards" % cards_unlocked
	comp_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	comp_label.add_theme_font_size_override("font_size", 12)
	vbox.add_child(comp_label)
	
	# Visual state based on ownership
	if owned_decks.has(deck_id) and owned_decks[deck_id]:
		card.modulate = Color.WHITE
	elif completion > 0:
		card.modulate = Color(0.9, 0.9, 1.0)  # Partial
	else:
		card.modulate = Color(0.5, 0.5, 0.5)  # Locked
	
	# Click handler
	card.gui_input.connect(_on_deck_card_clicked.bind(deck_id))
	
	return card

func _on_deck_card_clicked(event: InputEvent, deck_id: String) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		selected_deck = deck_id
		_update_deck_info_panel()

func _update_deck_info_panel() -> void:
	if not selected_deck or not deck_info_panel:
		return
	
	deck_info_panel.visible = true
	var deck_data := deck_database.get(selected_deck, {})
	
	if deck_name_label:
		deck_name_label.text = deck_data.get("name", "Unknown Deck")
	if deck_artist_label:
		deck_artist_label.text = "Artist: " + deck_data.get("artist", "Unknown")
	if deck_theme_label:
		deck_theme_label.text = "Theme: " + deck_data.get("theme", "Classic")
	
	var progress_data := deck_progress.get(selected_deck, {})
	var cards_unlocked := progress_data.get("cards_unlocked", 0)
	var completion := progress_data.get("completion", 0.0)
	
	if completion_label:
		completion_label.text = "Completion: %d/78 Cards (%.1f%%)" % [cards_unlocked, completion]
	if progress_bar:
		progress_bar.value = completion

func _show_gallery() -> void:
	if not selected_deck or not gallery_view:
		return
	
	gallery_view.visible = true
	_populate_gallery()

func _populate_gallery() -> void:
	# Clear existing cards
	for child in gallery_grid.get_children():
		child.queue_free()
	
	var progress_data := deck_progress.get(selected_deck, {})
	var unlocked_cards := progress_data.get("unlocked_list", [])
	
	# Major Arcana section (0-21)
	for i in range(22):
		var card_id := "major_%02d" % i
		var card_item := _create_gallery_card(card_id, card_id in unlocked_cards)
		gallery_grid.add_child(card_item)
	
	# Minor Arcana by suit
	var suits := ["wands", "cups", "swords", "pentacles"]
	for suit in suits:
		for i in range(1, 15):  # Ace to King
			var card_id := "%s_%02d" % [suit, i]
			var card_item := _create_gallery_card(card_id, card_id in unlocked_cards)
			gallery_grid.add_child(card_item)

func _create_gallery_card(card_id: String, is_unlocked: bool) -> Control:
	var card := TextureRect.new()
	card.custom_minimum_size = Vector2(100, 140)
	card.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	
	if is_unlocked:
		card.modulate = Color.WHITE
		# Load actual card image
	else:
		card.modulate = Color(0.3, 0.3, 0.3)  # Silhouette
	
	card.tooltip_text = card_id
	return card

func _get_filtered_decks() -> Array:
	var result := []
	for deck_id in deck_database:
		var should_include := false
		var is_owned := owned_decks.has(deck_id) and owned_decks[deck_id]
		var completion := deck_progress.get(deck_id, {}).get("completion", 0.0)
		
		match filter_mode:
			"all":
				should_include = true
			"owned":
				should_include = is_owned
			"partial":
				should_include = completion > 0 and completion < 100
			"locked":
				should_include = completion == 0
		
		if should_include:
			result.append(deck_id)
	
	return result

func _sort_decks(deck_list: Array) -> Array:
	match sort_mode:
		"progress":
			deck_list.sort_custom(func(a, b):
				var prog_a := deck_progress.get(a, {}).get("completion", 0.0)
				var prog_b := deck_progress.get(b, {}).get("completion", 0.0)
				return prog_a > prog_b
			)
		"artist":
			deck_list.sort_custom(func(a, b):
				var artist_a := deck_database.get(a, {}).get("artist", "")
				var artist_b := deck_database.get(b, {}).get("artist", "")
				return artist_a < artist_b
			)
		"release":
			deck_list.sort_custom(func(a, b):
				var date_a := deck_database.get(a, {}).get("release_date", "")
				var date_b := deck_database.get(b, {}).get("release_date", "")
				return date_a > date_b
			)
	return deck_list

func _on_filter_changed(mode: String) -> void:
	filter_mode = mode
	_populate_deck_grid()

func _on_sort_changed(index: int) -> void:
	match index:
		0: sort_mode = "progress"
		1: sort_mode = "artist"
		2: sort_mode = "release"
	_populate_deck_grid()

func _connect_signals() -> void:
	if gallery_view:
		var close_gallery := gallery_view.get_node_or_null("CloseButton")
		if close_gallery:
			close_gallery.pressed.connect(func(): gallery_view.visible = false)

func _back() -> void:
	var menu: PackedScene = load("res://scenes/Menu.tscn")
	get_tree().change_scene_to_packed(menu)

# Method to unlock cards (called from PvE rewards)
func unlock_cards_for_deck(deck_id: String, card_ids: Array) -> void:
	if not deck_progress.has(deck_id):
		deck_progress[deck_id] = {"cards_unlocked": 0, "completion": 0.0, "unlocked_list": []}
	
	var progress_data := deck_progress[deck_id]
	var unlocked_list: Array = progress_data.get("unlocked_list", [])
	
	for card_id in card_ids:
		if not card_id in unlocked_list:
			unlocked_list.append(card_id)
	
	progress_data["unlocked_list"] = unlocked_list
	progress_data["cards_unlocked"] = unlocked_list.size()
	progress_data["completion"] = (unlocked_list.size() / 78.0) * 100.0
	
	if progress_data["completion"] >= 100.0:
		owned_decks[deck_id] = true
	
	ProjectSettings.set_setting("tarot/deck_progress", deck_progress)
	ProjectSettings.set_setting("tarot/owned_decks", owned_decks)
	ProjectSettings.save()
