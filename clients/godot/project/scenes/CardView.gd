extends Node2D

@onready var label: Label = $Label

func set_card_name(card_name: String) -> void:
	label.text = card_name
