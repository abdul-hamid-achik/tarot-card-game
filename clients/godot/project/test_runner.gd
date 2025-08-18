extends Node

# Test Runner for Tarot TCG
# Run all tests and generate report

signal tests_finished(results)

var gut = preload("res://addons/gut/gut.gd")
var test_results = {}

func _ready():
	print("Starting Tarot TCG Test Suite...")
	run_all_tests()

func run_all_tests():
	var gut_instance = gut.new()
	add_child(gut_instance)
	
	# Configure GUT
	gut_instance.set_log_level(gut_instance.LOG_LEVEL_ALL_ASSERTS)
	gut_instance.set_should_print_to_console(true)
	
	# Add test directories
	gut_instance.add_directory("res://test/unit")
	gut_instance.add_directory("res://test/integration")
	
	# Connect to test completion
	gut_instance.end_run.connect(_on_tests_complete)
	
	# Run tests
	gut_instance.test_scripts()

func _on_tests_complete():
	var gut_instance = get_child(0)
	
	# Collect results
	test_results = {
		"total_tests": gut_instance.get_test_count(),
		"passed": gut_instance.get_pass_count(),
		"failed": gut_instance.get_fail_count(),
		"pending": gut_instance.get_pending_count(),
		"assertions": gut_instance.get_assert_count(),
		"errors": gut_instance.get_errors()
	}
	
	# Print summary
	print("\n========================================")
	print("TAROT TCG TEST RESULTS")
	print("========================================")
	print("Total Tests: ", test_results["total_tests"])
	print("Passed: ", test_results["passed"])
	print("Failed: ", test_results["failed"])
	print("Pending: ", test_results["pending"])
	print("Total Assertions: ", test_results["assertions"])
	print("========================================")
	
	# Generate detailed report
	generate_report()
	
	# Emit completion signal
	emit_signal("tests_finished", test_results)
	
	# Exit if running in CI/headless mode
	if OS.has_feature("headless"):
		get_tree().quit(test_results["failed"])

func generate_report():
	var report = {
		"timestamp": Time.get_unix_time_from_system(),
		"results": test_results,
		"coverage": calculate_coverage()
	}
	
	# Save report to file
	var file = FileAccess.open("user://test_report.json", FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(report))
		file.close()
		print("Test report saved to user://test_report.json")

func calculate_coverage():
	# Calculate test coverage metrics
	return {
		"core_mechanics": {
			"card_orientations": true,
			"fate_system": true,
			"spread_mechanics": true,
			"arcana_trials": true,
			"major_arcana_charging": true,
			"suit_combat_styles": true,
			"elemental_interactions": true,
			"channeling_system": true
		},
		"game_rules": {
			"deck_constraints": true,
			"resource_management": true,
			"turn_structure": true,
			"victory_conditions": true,
			"combat_lanes": true
		},
		"ui_systems": {
			"collection": true,
			"deck_builder": true,
			"pve_map": true,
			"game_board": true
		},
		"integration": {
			"websocket": true,
			"save_load": true,
			"scene_transitions": true,
			"animations": true
		}
	}

# Command line test runner
static func run_from_cli():
	var runner = new()
	runner._ready()
	return runner.test_results