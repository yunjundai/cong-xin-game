import type { InnerTileType, OuterTileType } from '../core/types';

export interface TileCoord {
  x: number; // 0~100 (%)
  y: number; // 0~100 (%)
}

/**
 * 對應 town_diorama.jpg 的等角菱形 24 格環形石磚步道座標（順時針：左下起點 -> 左上 -> 右上 -> 右下）
 * 4 個頂點座標依實際圖片透視精準校準：
 * 左角 (18.5, 49.0)、上角 (48.0, 21.5)、右角 (81.5, 51.0)、下角 (52.5, 79.5)
 */
export function getInnerBoardCoords(): TileCoord[] {
  const left: TileCoord = { x: 20.5, y: 49.5 };
  const top: TileCoord = { x: 48.0, y: 23.0 };
  const right: TileCoord = { x: 79.5, y: 50.5 };
  const bottom: TileCoord = { x: 52.5, y: 77.5 };

  const lerp = (a: TileCoord, b: TileCoord, t: number): TileCoord => ({
    x: Number((a.x + (b.x - a.x) * t).toFixed(2)),
    y: Number((a.y + (b.y - a.y) * t).toFixed(2)),
  });

  const coords: TileCoord[] = [];
  // 每邊 6 段（含起點共 24 格）
  for (let i = 0; i < 6; i++) coords.push(lerp(bottom, left, i / 6));
  for (let i = 0; i < 6; i++) coords.push(lerp(left, top, i / 6));
  for (let i = 0; i < 6; i++) coords.push(lerp(top, right, i / 6));
  for (let i = 0; i < 6; i++) coords.push(lerp(right, bottom, i / 6));
  return coords;
}

/**
 * 對應 coast_diorama.jpg 的 28 格花東海岸環形石磚步道座標（順時針：左下 -> 左上 -> 右上 -> 右下）
 * 上邊 9 格、右邊 5 格、下邊 9 格、左邊 5 格 = 28 格
 */
export function getOuterBoardCoords(): TileCoord[] {
  const bl: TileCoord = { x: 18.0, y: 73.5 };
  const tl: TileCoord = { x: 22.0, y: 27.5 };
  const tr: TileCoord = { x: 77.5, y: 26.5 };
  const br: TileCoord = { x: 82.0, y: 73.5 };

  const lerp = (a: TileCoord, b: TileCoord, t: number): TileCoord => ({
    x: Number((a.x + (b.x - a.x) * t).toFixed(2)),
    y: Number((a.y + (b.y - a.y) * t).toFixed(2)),
  });

  const coords: TileCoord[] = [];
  for (let i = 0; i < 5; i++) coords.push(lerp(bl, tl, i / 5));
  for (let i = 0; i < 9; i++) coords.push(lerp(tl, tr, i / 9));
  for (let i = 0; i < 5; i++) coords.push(lerp(tr, br, i / 5));
  for (let i = 0; i < 9; i++) coords.push(lerp(br, bl, i / 9));
  return coords;
}

export const INNER_TILE_META: Record<
  InnerTileType,
  { label: string; short: string; bg: string; border: string; text: string }
> = {
  opportunity: {
    label: '機會',
    short: '機',
    bg: 'bg-[#245E50]',
    border: 'border-[#A7D7C5]',
    text: 'text-white',
  },
  payday: {
    label: '發薪日',
    short: '薪',
    bg: 'bg-[#E8A849]',
    border: 'border-[#FFF3D1]',
    text: 'text-[#2B2111]',
  },
  doodad: {
    label: '額外支出',
    short: '支',
    bg: 'bg-[#C85A32]',
    border: 'border-[#F7C7B5]',
    text: 'text-white',
  },
  market: {
    label: '市場動向',
    short: '市',
    bg: 'bg-[#5B4B8A]',
    border: 'border-[#D5CBEF]',
    text: 'text-white',
  },
  charity: {
    label: '公益捐款',
    short: '愛',
    bg: 'bg-[#2E8B99]',
    border: 'border-[#BCE7EE]',
    text: 'text-white',
  },
  baby: {
    label: '新生命',
    short: '育',
    bg: 'bg-[#C96B84]',
    border: 'border-[#FAD2DD]',
    text: 'text-white',
  },
  unpaidLeave: {
    label: '無薪假',
    short: '休',
    bg: 'bg-[#5C6468]',
    border: 'border-[#D1D7DA]',
    text: 'text-white',
  },
};

export const OUTER_TILE_META: Record<
  OuterTileType,
  { label: string; short: string; bg: string; border: string; text: string }
> = {
  investment: {
    label: '東岸投資',
    short: '投',
    bg: 'bg-[#2E8B99]',
    border: 'border-[#C5EDF2]',
    text: 'text-white',
  },
  cashflowDay: {
    label: '現金流日',
    short: '流',
    bg: 'bg-[#E8A849]',
    border: 'border-[#FFF3D1]',
    text: 'text-[#2B2111]',
  },
  dream: {
    label: '夢想實現',
    short: '夢',
    bg: 'bg-[#D97757]',
    border: 'border-[#FDE1D6]',
    text: 'text-white',
  },
  risk: {
    label: '突發風險',
    short: '險',
    bg: 'bg-[#9E3B33]',
    border: 'border-[#F5C2BE]',
    text: 'text-white',
  },
};

// 職業頭像映射：優先使用新微縮公仔樣本（4 職業），其餘無縫銜接既有 portraits_v2.webp 6x4 網格
export function getPortraitStyle(professionIndex: number, gender: 'M' | 'F'): {
  image: string;
  position: string;
  size: string;
} {
  // 4 個新微縮公仔樣本：保全(M, 0), 護理師(F, 3), 機師(M, 11), 餐飲服務員(F, 1)
  if (professionIndex === 0 && gender === 'M') {
    return { image: './assets/art/portraits_diorama_sample.jpg', position: '0% 0%', size: '200% 200%' };
  }
  if (professionIndex === 3 && gender === 'F') {
    return { image: './assets/art/portraits_diorama_sample.jpg', position: '100% 0%', size: '200% 200%' };
  }
  if (professionIndex === 11 && gender === 'M') {
    return { image: './assets/art/portraits_diorama_sample.jpg', position: '0% 100%', size: '200% 200%' };
  }
  if (professionIndex === 1 && gender === 'F') {
    return { image: './assets/art/portraits_diorama_sample.jpg', position: '100% 100%', size: '200% 200%' };
  }

  // portraits_v2.webp 為 6 欄 x 4 列（前兩列男 0~11，後兩列女 0~11）
  const col = professionIndex % 6;
  const row = Math.floor(professionIndex / 6) + (gender === 'F' ? 2 : 0);
  const posX = (col / 5) * 100;
  const posY = (row / 3) * 100;
  return {
    image: './assets/art/portraits_v2.webp',
    position: `${posX}% ${posY}%`,
    size: '600% 400%',
  };
}

// dreams.webp 為 4 欄 x 2 列
export function getDreamArtStyle(dreamIndex: number): {
  image: string;
  position: string;
  size: string;
} {
  const col = dreamIndex % 4;
  const row = Math.floor(dreamIndex / 4);
  return {
    image: './assets/art/dreams.webp',
    position: `${(col / 3) * 100}% ${row * 100}%`,
    size: '400% 200%',
  };
}
