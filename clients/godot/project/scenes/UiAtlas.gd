extends Node

## Simple helper to slice a grid atlas.
## Usage:
##   var f = UiAtlas.get_frame(5, 8, 4, 64, 64) # index, columns, rows, tile_w, tile_h
##   var tex := ImageTexture.create_from_image(img)
##   var region := Rect2(f.x, f.y, f.w, f.h)

class_name UiAtlas

static func get_frame(index: int, columns: int, rows: int, tile_w: int, tile_h: int, gap_x: int = 0, gap_y: int = 0, off_x: int = 0, off_y: int = 0) -> Dictionary:
	if index < 0 or index >= columns * rows:
		push_error("index %d out of range for %dx%d grid" % [index, columns, rows])
		return {"x": 0, "y": 0, "w": tile_w, "h": tile_h}
	var col := index % columns
	var row := int(index / columns)
	var x := off_x + col * (tile_w + gap_x)
	var y := off_y + row * (tile_h + gap_y)
	return {"x": x, "y": y, "w": tile_w, "h": tile_h}
