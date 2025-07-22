extends Node2D

@onready var label: Label = $Label
var lines: PackedStringArray = []

func append_line(text_line: String) -> void:
	lines.append(text_line)
	if lines.size() > 10:
		lines.remove_at(0)
	label.text = "Stream:\n" + "\n".join(lines)
