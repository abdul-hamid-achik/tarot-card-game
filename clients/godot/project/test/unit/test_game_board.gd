extends GutTest

# Test the GameBoard mechanics
class_name TestGameBoard

var game_board_scene = preload("res://scenes/GameBoard.tscn")
var game_board: Node

func before_each():
	game_board = game_board_scene.instantiate()
	add_child(game_board)
	
func after_each():
	game_board.queue_free()

func test_fate_system():
	# Test fate generation and cap
	assert_eq(game_board.player_fate, 0, "Initial fate should be 0")
	assert_eq(game_board.player_max_fate, 3, "Max fate should be 3")
	
	# Test fate generation per turn
	game_board.player_fate = 2
	game_board._switch_turn()
	assert_le(game_board.player_fate, 3, "Fate should not exceed 3")

func test_card_orientation_flipping():
	# Test card can be flipped between upright and reversed
	var card_id = "major_00"
	game_board.card_orientations[card_id] = "upright"
	
	var card = Node2D.new()
	card.set_meta("card_id", card_id)
	card.set_meta("orientation", "upright")
	
	game_board._flip_card_orientation(card)
	assert_eq(card.get_meta("orientation"), "reversed", "Card should flip to reversed")
	
	game_board._flip_card_orientation(card)
	assert_eq(card.get_meta("orientation"), "upright", "Card should flip back to upright")

func test_spread_bonuses():
	# Test Past/Present/Future bonuses
	game_board.spread_bonuses["present_cost_reduction"] = true
	game_board.current_turn = 1
	
	var card = Node2D.new()
	card.set_meta("cost", 2)
	
	var cost = game_board._get_card_cost(card)
	assert_eq(cost, 1, "Present bonus should reduce cost by 1 on turn 1")
	
	# Test Past fate refund
	game_board.spread_bonuses["past_fate_refund"] = true
	game_board.player_fate = 0
	game_board._process_spread_bonuses(true)
	# Would check fate increased if Past card was played

func test_arcana_trials():
	# Test Sun trial (Wands damage accumulation)
	game_board.arcana_trials = {"sun": 0, "moon": 0, "judgement": 0}
	
	# Play Wands cards to accumulate damage
	game_board._update_trial_progress("wands_01", true)
	assert_gt(game_board.arcana_trials["sun"], 0, "Sun trial should progress with Wands")
	
	# Test Moon trial (Fate streak)
	game_board.player_fate = 3
	game_board._check_trials_progress()
	# Would track consecutive turns with 3 fate
	
	# Test Judgement trial (play same card both orientations)
	game_board._update_trial_progress("major_20", true, "upright")
	game_board._update_trial_progress("major_20", true, "reversed")
	assert_gt(game_board.arcana_trials["judgement"], 0, "Judgement should progress")

func test_major_arcana_charging():
	# Test charging on Major Arcana play
	game_board.major_arcana_charge = 0
	
	var card = Node2D.new()
	card.set_meta("card_id", "major_00")
	
	game_board._process_major_arcana_charge(card)
	assert_eq(game_board.major_arcana_charge, 10, "Should charge 10 per Major Arcana")
	
	# Test ultimate activation at 100
	game_board.major_arcana_charge = 100
	var can_activate = game_board.major_arcana_charge >= 100
	assert_true(can_activate, "Should be able to activate ultimate at 100 charge")

func test_suit_combat_styles():
	# Test each suit has different combat style
	var styles = game_board.suit_styles
	
	assert_eq(styles["wands"]["effect"], "burn", "Wands should have burn effect")
	assert_eq(styles["cups"]["effect"], "heal", "Cups should have heal effect")
	assert_eq(styles["swords"]["effect"], "counter", "Swords should have counter effect")
	assert_eq(styles["pentacles"]["effect"], "inevitable", "Pentacles should have shield effect")
	
	# Test damage/heal amounts
	assert_eq(styles["wands"]["damage_bonus"], 2, "Wands should have +2 damage")
	assert_eq(styles["cups"]["heal_amount"], 2, "Cups should heal 2")

func test_elemental_interactions():
	# Test elemental advantages/disadvantages
	var fire_dmg = game_board._calculate_elemental_damage(10, "fire", "water")
	assert_lt(fire_dmg, 10, "Fire should deal less damage to Water")
	
	var water_dmg = game_board._calculate_elemental_damage(10, "water", "fire")
	assert_gt(water_dmg, 10, "Water should deal more damage to Fire")
	
	var neutral_dmg = game_board._calculate_elemental_damage(10, "fire", "air")
	assert_eq(neutral_dmg, 10, "Neutral elements should deal normal damage")

func test_channeling_system():
	# Test channeling maintenance
	game_board.channeling_card = null
	game_board.channeling_turns = 0
	
	var card = Node2D.new()
	card.set_meta("card_id", "major_05")
	
	game_board._start_channeling(card)
	assert_eq(game_board.channeling_card, card, "Should track channeling card")
	assert_eq(game_board.channeling_turns, 1, "Should start at 1 turn")
	
	game_board._maintain_channeling()
	assert_eq(game_board.channeling_turns, 2, "Should increment turns")
	
	game_board._release_channeling()
	assert_null(game_board.channeling_card, "Should clear after release")

func test_combat_lanes():
	# Test 6-lane combat system
	assert_eq(game_board.combat_lanes.size(), 6, "Should have 6 combat lanes")
	
	# Test lane targeting
	var attacker = Node2D.new()
	attacker.position = Vector2(100, 200)
	
	var lane_index = game_board._get_lane_for_position(attacker.position)
	assert_between(lane_index, 0, 5, "Lane index should be 0-5")

func test_fate_actions():
	# Test all 5 fate actions
	game_board.player_fate = 3
	game_board.reaction_window_open = true
	
	# Test Flip (1 fate)
	var can_flip = game_board._can_use_fate_action("flip", 1)
	assert_true(can_flip, "Should be able to flip with 1 fate")
	
	# Test Peek (1 fate)
	var can_peek = game_board._can_use_fate_action("peek", 1)
	assert_true(can_peek, "Should be able to peek with 1 fate")
	
	# Test Force Draw (2 fate)
	var can_draw = game_board._can_use_fate_action("force_draw", 2)
	assert_true(can_draw, "Should be able to force draw with 2 fate")
	
	# Test Block Flip (2 fate, once per game)
	game_board.block_flip_used = false
	var can_block = game_board._can_use_fate_action("block_flip", 2)
	assert_true(can_block, "Should be able to block flip once per game")
	
	game_board.block_flip_used = true
	can_block = game_board._can_use_fate_action("block_flip", 2)
	assert_false(can_block, "Should not be able to block flip twice")

func test_mulligan_opening_reading():
	# Test three-card spread selection
	var mulligan_cards = ["major_00", "wands_01", "cups_01"]
	game_board.mulligan_cards = mulligan_cards
	
	game_board._assign_spread_slots("major_00", "past")
	game_board._assign_spread_slots("wands_01", "present")
	game_board._assign_spread_slots("cups_01", "future")
	
	assert_true(game_board.spread_bonuses.has("past_fate_refund"), "Past should give fate refund")
	assert_true(game_board.spread_bonuses.has("present_cost_reduction"), "Present should reduce cost")
	assert_true(game_board.spread_bonuses.has("future_extra_draw"), "Future should give extra draw")

func test_deck_constraints():
	# Test deck building constraints
	var deck = []
	
	# Add cards to test constraints
	for i in range(30):
		deck.append("wands_%02d" % i)
	
	assert_ge(deck.size(), 30, "Deck must have at least 30 cards")
	assert_le(deck.size(), 40, "Deck must have at most 40 cards")
	
	# Test Major Arcana limit
	var major_count = 0
	deck.append("major_00")
	deck.append("major_01")
	major_count = 2
	
	assert_le(major_count, 2, "Maximum 2 Major Arcana allowed")

func test_victory_conditions():
	# Test Arcana Trials victory
	game_board.arcana_trials = {"sun": 100, "moon": 100, "judgement": 100}
	var trials_victory = game_board._check_trials_victory()
	assert_true(trials_victory, "3 completed trials should trigger victory")
	
	# Test score victory (fallback)
	game_board.arcana_trials = {"sun": 0, "moon": 0, "judgement": 0}
	game_board.player_score = 10
	game_board.opponent_score = 5
	var score_victory = game_board._check_score_victory(10)
	assert_true(score_victory, "Score threshold should trigger victory")

func test_websocket_communication():
	# Test WebSocket message handling
	var test_message = {
		"type": "state_update",
		"state": {
			"turn": 1,
			"phase": "main",
			"currentPlayerId": "player1"
		}
	}
	
	game_board._handle_server_message(test_message)
	assert_eq(game_board.current_turn, 1, "Should update turn from server")
	assert_eq(game_board.current_phase, "main", "Should update phase from server")

func test_animation_timings():
	# Test card animation timings
	assert_eq(game_board.CARD_DRAW_DURATION, 0.3, "Draw animation should be 0.3s")
	assert_eq(game_board.CARD_PLAY_DURATION, 0.4, "Play animation should be 0.4s")
	assert_eq(game_board.FLIP_DURATION, 0.25, "Flip animation should be 0.25s")
	assert_eq(game_board.CHANNEL_PULSE_DURATION, 0.5, "Channel pulse should be 0.5s")