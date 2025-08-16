// Helper to slice simple grid-based atlases into CSS background positions or <img> crops
// Assumes each atlas is a grid of equally-sized tiles (columns x rows)

export type AtlasGrid = {
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  gapX?: number; // optional horizontal gap between tiles
  gapY?: number; // optional vertical gap between tiles
  offsetX?: number; // optional left margin before first tile
  offsetY?: number; // optional top margin before first tile
};

export type SpriteFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getFrame(index: number, grid: AtlasGrid): SpriteFrame {
  const { columns, rows, tileWidth, tileHeight } = grid;
  const gapX = grid.gapX ?? 0;
  const gapY = grid.gapY ?? 0;
  const offsetX = grid.offsetX ?? 0;
  const offsetY = grid.offsetY ?? 0;

  if (index < 0 || index >= columns * rows) {
    throw new Error(`index ${index} out of range for ${columns}x${rows} grid`);
  }
  const col = index % columns;
  const row = Math.floor(index / columns);
  const x = offsetX + col * (tileWidth + gapX);
  const y = offsetY + row * (tileHeight + gapY);
  return { x, y, width: tileWidth, height: tileHeight };
}

export function cssBackgroundStyle(imageUrl: string, frame: SpriteFrame): React.CSSProperties {
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundPosition: `-${frame.x}px -${frame.y}px`,
    backgroundSize: 'auto',
    width: frame.width,
    height: frame.height,
    display: 'inline-block',
  } as React.CSSProperties;
}

export function imgClipStyle(imageUrl: string, frame: SpriteFrame): { wrapper: React.CSSProperties; img: React.CSSProperties } {
  const wrapper: React.CSSProperties = {
    width: frame.width,
    height: frame.height,
    overflow: 'hidden',
    position: 'relative',
    display: 'inline-block',
  };
  const img: React.CSSProperties = {
    position: 'absolute',
    left: -frame.x,
    top: -frame.y,
  } as React.CSSProperties;
  return { wrapper, img: { ...img, } };
}
