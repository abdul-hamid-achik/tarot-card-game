extends Node
class_name AIOpponent

# AI Difficulty Levels
enum Difficulty {
	EASY,
	MEDIUM,
	HARD,
	EXPERT
}

# AI Personality Types
enum Personality {
	AGGRESSIVE,  # Focus on damage
	DEFENSIVE,   # Focus on healing/shields
	BALANCED,    # Mix of strategies
	CHAOTIC      # Random behavior
}

# AI configuration
var difficulty: Difficulty = Difficulty.MEDIUM
var personality: Personality = Personality.BALANCED
var reaction_time: float = 1.5
var mistake_chance: float = 0.15
var lookahead_depth: int = 2

# Game state reference
var game_board: Node = null
var player_id: String = "ai"

# Decision tracking
var current_strategy: String = "balanced"
var last_decision: Dictionary = {}
var decision_history: Array = []

func _ready():
	print("AI Opponent initialized")

# Initialize AI with settings
func initialize(board: Node, diff: Difficulty = Difficulty.MEDIUM, pers: Personality = Personality.BALANCED):
	game_board = board
	difficulty = diff
	personality = pers
	_update_ai_parameters()

func _update_ai_parameters():
	match difficulty:
		Difficulty.EASY:
			reaction_time = 2.0
			mistake_chance = 0.3
			lookahead_depth = 1
		Difficulty.MEDIUM:
			reaction_time = 1.5
			mistake_chance = 0.15
			lookahead_depth = 2
		Difficulty.HARD:
			reaction_time = 1.0
			mistake_chance = 0.05
			lookahead_depth = 3
		Difficulty.EXPERT:
			reaction_time = 0.5
			mistake_chance = 0.01
			lookahead_depth = 5

# Main AI turn execution
func execute_turn() -> void:
	print("AI thinking... (", Difficulty.keys()[difficulty], "/", Personality.keys()[personality], ")")
	
	# Simulate thinking time
	await game_board.get_tree().create_timer(reaction_time).timeout
	
	# Analyze game state
	var game_state = _analyze_game_state()
	
	# Choose strategy based on personality and state
	current_strategy = _choose_strategy(game_state)
	
	# Make decision
	var decision = _make_decision(game_state, current_strategy)
	
	# Add mistake chance
	if randf() < mistake_chance:
		decision = _make_mistake(decision, game_state)
	
	# Execute decision
	await _execute_decision(decision)
	
	# Store decision history
	decision_history.append(decision)
	if decision_history.size() > 10:
		decision_history.pop_front()

# Analyze current game state
func _analyze_game_state() -> Dictionary:
	return {
		"ai_health": game_board.opponent_health,
		"player_health": game_board.player_health,
		"ai_fate": game_board.opponent_fate,
		"player_fate": game_board.player_fate,
		"ai_hand": _get_hand_cards(false),
		"player_hand_size": game_board.player_hand_container.get_child_count(),
		"ai_lanes": _analyze_lanes(false),
		"player_lanes": _analyze_lanes(true),
		"trials": game_board.arcana_trials.duplicate(),
		"major_charge": game_board.opponent_major_arcana_charge,
		"turn": game_board.turn_count,
		"reaction_window": game_board.reaction_window != null,
		"spread_slots": game_board.spread_slots.duplicate(),
		"threat_level": _calculate_threat_level(),
		"win_progress": _evaluate_win_conditions()
	}

func _get_hand_cards(is_player: bool) -> Array:
	var container = game_board.player_hand_container if is_player else game_board.opponent_hand_container
	var cards = []
	for card in container.get_children():
		cards.append({
			"node": card,
			"id": card.get_meta("card_id", ""),
			"suit": _get_card_suit(card.get_meta("card_id", "")),
			"is_major": card.get_meta("card_id", "").begins_with("major_")
		})
	return cards

func _analyze_lanes(is_player: bool) -> Array:
	var lanes = []
	var container = game_board.player_lanes if is_player else game_board.opponent_lanes
	
	for i in range(6):
		if container[i].get_child_count() > 0:
			var card = container[i].get_child(0)
			lanes.append({
				"occupied": true,
				"card_id": card.get_meta("card_id", ""),
				"power": card.get_meta("power", 0),
				"orientation": game_board.card_orientations.get(card.get_meta("card_id", ""), "upright")
			})
		else:
			lanes.append({"occupied": false})
	
	return lanes

func _calculate_threat_level() -> float:
	var threat = 0.0
	
	# Health differential
	var health_diff = game_board.player_health - game_board.opponent_health
	threat += clamp(health_diff / 30.0, 0.0, 1.0) * 0.3
	
	# Board presence
	var player_cards = 0
	for lane in game_board.player_lanes:
		if lane.get_child_count() > 0:
			player_cards += 1
	threat += (player_cards / 6.0) * 0.3
	
	# Trial progress
	var trials = game_board.arcana_trials
	var max_trial = max(trials["sun"], max(trials["moon"], trials["judgement"]))
	threat += (max_trial / 100.0) * 0.4
	
	return clamp(threat, 0.0, 1.0)

func _evaluate_win_conditions() -> Dictionary:
	return {
		"health_victory": (30.0 - game_board.player_health) / 30.0,
		"trials_victory": _get_max_trial_progress(),
		"deck_out_victory": 1.0 if game_board.player_hand_container.get_child_count() == 0 else 0.0
	}

func _get_max_trial_progress() -> float:
	var trials = game_board.arcana_trials
	return max(trials["sun"], max(trials["moon"], trials["judgement"])) / 100.0

# Choose strategy based on personality and game state
func _choose_strategy(state: Dictionary) -> String:
	var threat = state["threat_level"]
	
	match personality:
		Personality.AGGRESSIVE:
			return "attack" if threat < 0.7 else "defend"
		Personality.DEFENSIVE:
			return "defend" if threat > 0.3 else "control"
		Personality.BALANCED:
			if threat > 0.7:
				return "defend"
			elif threat < 0.3:
				return "attack"
			else:
				return "control"
		Personality.CHAOTIC:
			var strategies = ["attack", "defend", "control", "combo"]
			return strategies[randi() % strategies.size()]
	
	return "balanced"

# Make decision based on strategy
func _make_decision(state: Dictionary, strategy: String) -> Dictionary:
	# Check for reaction window opportunities first
	if state["reaction_window"] and state["ai_fate"] >= 1:
		return _make_fate_decision(state)
	
	match strategy:
		"attack":
			return _make_aggressive_decision(state)
		"defend":
			return _make_defensive_decision(state)
		"control":
			return _make_control_decision(state)
		"combo":
			return _make_combo_decision(state)
		_:
			return _make_balanced_decision(state)

func _make_fate_decision(state: Dictionary) -> Dictionary:
	var fate = state["ai_fate"]
	
	# Divine Intervention if critical
	if fate >= 3 and state["threat_level"] > 0.8:
		return {
			"action": "divine_intervention",
			"confidence": 0.95,
			"reasoning": "Critical threat - using Divine Intervention"
		}
	
	# Force draw if opponent has few cards
	if fate >= 2 and state["player_hand_size"] <= 2:
		return {
			"action": "force_draw",
			"confidence": 0.8,
			"reasoning": "Forcing opponent to draw"
		}
	
	# Flip orientation on strong cards
	if fate >= 1:
		var dangerous_card = _find_most_dangerous_card(state)
		if dangerous_card:
			return {
				"action": "flip_orientation",
				"target": dangerous_card,
				"confidence": 0.85,
				"reasoning": "Flipping dangerous card"
			}
	
	# Peek for information
	if fate >= 1:
		return {
			"action": "peek",
			"confidence": 0.6,
			"reasoning": "Gathering information"
		}
	
	return {"action": "pass", "confidence": 0.3}

func _make_aggressive_decision(state: Dictionary) -> Dictionary:
	# Look for damage cards
	var damage_cards = []
	for card_data in state["ai_hand"]:
		if card_data["suit"] in ["wands", "swords"]:
			damage_cards.append(card_data)
	
	if damage_cards.size() > 0:
		var card = damage_cards[0]
		var lane = _find_best_attack_lane(state)
		return {
			"action": "play_card",
			"card": card["node"],
			"lane": lane,
			"confidence": 0.9,
			"reasoning": "Aggressive play with " + card["id"]
		}
	
	return {"action": "end_turn", "confidence": 0.3}

func _make_defensive_decision(state: Dictionary) -> Dictionary:
	# Look for healing/shield cards
	var defensive_cards = []
	for card_data in state["ai_hand"]:
		if card_data["suit"] in ["cups", "pentacles"]:
			defensive_cards.append(card_data)
	
	if defensive_cards.size() > 0:
		var card = defensive_cards[0]
		var lane = _find_safest_lane(state)
		return {
			"action": "play_card",
			"card": card["node"],
			"lane": lane,
			"confidence": 0.85,
			"reasoning": "Defensive play with " + card["id"]
		}
	
	# Use fate defensively
	if state["ai_fate"] >= 3 and state["reaction_window"]:
		return {
			"action": "divine_intervention",
			"confidence": 0.9,
			"reasoning": "Defensive Divine Intervention"
		}
	
	return {"action": "end_turn", "confidence": 0.4}

func _make_control_decision(state: Dictionary) -> Dictionary:
	# Balance offense and defense
	if state["ai_health"] < 15:
		return _make_defensive_decision(state)
	elif state["player_health"] < 10:
		return _make_aggressive_decision(state)
	
	# Use fate for control
	if state["ai_fate"] >= 2 and state["reaction_window"]:
		return {
			"action": "force_draw",
			"confidence": 0.75,
			"reasoning": "Controlling opponent's hand"
		}
	
	# Play balanced card
	if state["ai_hand"].size() > 0:
		var card = state["ai_hand"][0]
		var lane = _find_best_lane(state)
		return {
			"action": "play_card",
			"card": card["node"],
			"lane": lane,
			"confidence": 0.65,
			"reasoning": "Balanced play"
		}
	
	return {"action": "end_turn", "confidence": 0.5}

func _make_combo_decision(state: Dictionary) -> Dictionary:
	# Look for Major Arcana combos
	for card_data in state["ai_hand"]:
		if card_data["is_major"]:
			if state["major_charge"] >= 90:
				return {
					"action": "activate_ultimate",
					"card": card_data["node"],
					"confidence": 1.0,
					"reasoning": "Activating Major Arcana Ultimate!"
				}
			else:
				return {
					"action": "play_card",
					"card": card_data["node"],
					"lane": _find_best_lane(state),
					"confidence": 0.9,
					"reasoning": "Charging Major Arcana"
				}
	
	# Channel for combo
	if state["ai_hand"].size() > 3:
		var card = state["ai_hand"][0]
		return {
			"action": "channel",
			"card": card["node"],
			"confidence": 0.7,
			"reasoning": "Setting up combo"
		}
	
	return _make_balanced_decision(state)

func _make_balanced_decision(state: Dictionary) -> Dictionary:
	var best_decision = {"action": "end_turn", "confidence": 0.5}
	var best_value = 0.5
	
	# Evaluate each possible play
	for card_data in state["ai_hand"]:
		for lane in range(6):
			var value = _evaluate_play(card_data, lane, state)
			if value > best_value:
				best_value = value
				best_decision = {
					"action": "play_card",
					"card": card_data["node"],
					"lane": lane,
					"confidence": value,
					"reasoning": "Best evaluated play"
				}
	
	# Consider spread placement
	if state["turn"] <= 3 and not state["spread_slots"]["past"]:
		var spread_decision = _evaluate_spread_placement(state, "past")
		if spread_decision["confidence"] > best_value:
			return spread_decision
	
	return best_decision

func _make_mistake(decision: Dictionary, state: Dictionary) -> Dictionary:
	# Intentionally make a suboptimal decision
	print("AI made a mistake!")
	
	if state["ai_hand"].size() > 0:
		var random_card = state["ai_hand"][randi() % state["ai_hand"].size()]
		return {
			"action": "play_card",
			"card": random_card["node"],
			"lane": randi() % 6,
			"confidence": 0.3,
			"reasoning": "Mistake - random play"
		}
	
	return {"action": "end_turn", "confidence": 0.2}

# Evaluation functions
func _evaluate_play(card_data: Dictionary, lane: int, state: Dictionary) -> float:
	var value = 0.5
	
	# Card value
	if card_data["is_major"]:
		value += 0.2
		if state["major_charge"] >= 70:
			value += 0.3
	
	# Suit synergy
	var suit = card_data["suit"]
	if suit == "wands" and state["player_health"] < 15:
		value += 0.3
	elif suit == "cups" and state["ai_health"] < 15:
		value += 0.3
	elif suit == "swords" and _count_occupied_lanes(state["player_lanes"]) > 3:
		value += 0.2
	elif suit == "pentacles" and state["threat_level"] > 0.6:
		value += 0.2
	
	# Lane value
	if not state["ai_lanes"][lane]["occupied"]:
		value += 0.1
	if state["player_lanes"][lane]["occupied"]:
		value += 0.15
	
	# Elemental matchup
	if state["player_lanes"][lane]["occupied"]:
		var matchup = _evaluate_elemental_matchup(suit, 
			_get_card_suit(state["player_lanes"][lane]["card_id"]))
		value += matchup * 0.2
	
	return clamp(value, 0.0, 1.0)

func _evaluate_spread_placement(state: Dictionary, slot: String) -> Dictionary:
	# Find best card for spread
	var best_card = null
	var best_value = 0.0
	
	for card_data in state["ai_hand"]:
		var value = 0.5
		if card_data["is_major"]:
			value += 0.4  # Major Arcana are great for spread
		
		if value > best_value:
			best_value = value
			best_card = card_data
	
	if best_card and best_value > 0.6:
		return {
			"action": "assign_spread",
			"card": best_card["node"],
			"slot": slot,
			"confidence": best_value,
			"reasoning": "Optimal spread placement"
		}
	
	return {"action": "pass", "confidence": 0.3}

func _evaluate_elemental_matchup(attacker_suit: String, defender_suit: String) -> float:
	# Elemental advantages
	var matchups = {
		"wands": {"swords": 0.5, "cups": -0.5},  # Fire
		"cups": {"wands": 0.5, "pentacles": -0.5},  # Water
		"swords": {"pentacles": 0.5, "wands": -0.5},  # Air
		"pentacles": {"cups": 0.5, "swords": -0.5}  # Earth
	}
	
	if attacker_suit in matchups and defender_suit in matchups[attacker_suit]:
		return matchups[attacker_suit][defender_suit]
	
	return 0.0

# Helper functions
func _find_best_attack_lane(state: Dictionary) -> int:
	# Find empty player lane for direct damage
	for i in range(6):
		if not state["player_lanes"][i]["occupied"]:
			return i
	
	# Otherwise find weakest opponent lane
	var weakest = 0
	var min_power = 999
	for i in range(6):
		if state["player_lanes"][i]["occupied"]:
			var power = state["player_lanes"][i]["power"]
			if power < min_power:
				min_power = power
				weakest = i
	
	return weakest

func _find_safest_lane(state: Dictionary) -> int:
	# Find lane with no opponent threat
	for i in range(6):
		if not state["player_lanes"][i]["occupied"]:
			return i
	return 5  # Default to last lane

func _find_best_lane(state: Dictionary) -> int:
	var best_lane = 0
	var best_score = -1.0
	
	for i in range(6):
		var score = 0.5
		
		# Empty lanes are good
		if not state["ai_lanes"][i]["occupied"]:
			score += 0.2
		
		# Lanes opposite to player cards are important
		if state["player_lanes"][i]["occupied"]:
			score += 0.15
		
		if score > best_score:
			best_score = score
			best_lane = i
	
	return best_lane

func _find_most_dangerous_card(state: Dictionary) -> String:
	var most_dangerous = ""
	var max_threat = 0.0
	
	for lane_data in state["player_lanes"]:
		if lane_data["occupied"]:
			var threat = lane_data["power"]
			if lane_data["orientation"] == "upright":
				threat *= 1.0
			else:
				threat *= 0.7
			
			if threat > max_threat:
				max_threat = threat
				most_dangerous = lane_data["card_id"]
	
	return most_dangerous

func _count_occupied_lanes(lanes: Array) -> int:
	var count = 0
	for lane in lanes:
		if lane["occupied"]:
			count += 1
	return count

func _get_card_suit(card_id: String) -> String:
	if card_id.begins_with("wands_"):
		return "wands"
	elif card_id.begins_with("cups_"):
		return "cups"
	elif card_id.begins_with("swords_"):
		return "swords"
	elif card_id.begins_with("pentacles_"):
		return "pentacles"
	elif card_id.begins_with("major_"):
		return "major"
	return "unknown"

# Execute the AI's decision
func _execute_decision(decision: Dictionary) -> void:
	var action = decision.get("action", "end_turn")
	print("AI Decision: ", action, " (confidence: ", decision.get("confidence", 0), ")")
	print("Reasoning: ", decision.get("reasoning", ""))
	
	match action:
		"play_card":
			var card = decision.get("card")
			var lane = decision.get("lane", 0)
			if card:
				await game_board._ai_play_card(card, lane)
		
		"channel":
			var card = decision.get("card")
			if card:
				await game_board._ai_channel_card(card)
		
		"activate_ultimate":
			await game_board._ai_activate_ultimate()
		
		"flip_orientation":
			var target = decision.get("target")
			if target:
				await game_board._ai_use_fate_action("flip", target)
		
		"peek":
			await game_board._ai_use_fate_action("peek", null)
		
		"force_draw":
			await game_board._ai_use_fate_action("force_draw", null)
		
		"divine_intervention":
			await game_board._ai_use_fate_action("divine_intervention", null)
		
		"assign_spread":
			var card = decision.get("card")
			var slot = decision.get("slot")
			if card and slot:
				await game_board._ai_assign_spread(card, slot)
		
		_:
			await game_board._end_turn()

# Get current AI statistics
func get_stats() -> Dictionary:
	return {
		"difficulty": Difficulty.keys()[difficulty],
		"personality": Personality.keys()[personality],
		"current_strategy": current_strategy,
		"decisions_made": decision_history.size(),
		"last_decision": last_decision
	}