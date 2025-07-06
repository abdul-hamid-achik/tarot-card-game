extends Node2D

@onready var http := HTTPRequest.new()

func _ready() -> void:
	add_child(http)
	# Simple ping to backend health endpoint (requires local web dev server)
	http.request("http://localhost:3000/api/health")
