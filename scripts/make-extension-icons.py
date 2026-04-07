#!/usr/bin/env python3
"""从 doc/icons/icon1.png 生成扩展图标（边缘透明），输出到 public/icons/。"""
from __future__ import annotations

import math
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "doc" / "icons" / "icon1.png"
OUT_DIR = ROOT / "public" / "icons"
SIZES = (16, 32, 48, 128)


def flood_transparent_edge(
    pixels: list[tuple[int, int, int, int]],
    w: int,
    h: int,
    seeds: list[tuple[int, int]],
    tol: float = 52.0,
) -> None:
    visited = [False] * (w * h)

    def idx(x: int, y: int) -> int:
        return y * w + x

    for sx, sy in seeds:
        if sx < 0 or sx >= w or sy < 0 or sy >= h:
            continue
        ref = pixels[idx(sx, sy)][:3]
        if pixels[idx(sx, sy)][3] == 0:
            continue
        q = deque([(sx, sy)])
        while q:
            x, y = q.popleft()
            if x < 0 or x >= w or y < 0 or y >= h:
                continue
            i = idx(x, y)
            if visited[i]:
                continue
            if pixels[i][3] == 0:
                visited[i] = True
                continue
            p = pixels[i][:3]
            d = math.sqrt(
                (p[0] - ref[0]) ** 2 + (p[1] - ref[1]) ** 2 + (p[2] - ref[2]) ** 2
            )
            if d > tol:
                continue
            visited[i] = True
            r, g, b, _ = pixels[i]
            pixels[i] = (r, g, b, 0)
            for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                q.append((x + dx, y + dy))


def main() -> int:
    if not SRC.is_file():
        print(f"Missing source: {SRC}", file=sys.stderr)
        return 1

    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    raw = img.tobytes("raw", "RGBA")
    pixels = [tuple(raw[i : i + 4]) for i in range(0, len(raw), 4)]
    # 四角依次泛洪，共用 visited，以处理纹理导致的色差
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    flood_transparent_edge(pixels, w, h, seeds, tol=52.0)

    base = Image.new("RGBA", (w, h))
    base.putdata(pixels)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        resized = base.resize((size, size), Image.Resampling.LANCZOS)
        out = OUT_DIR / f"icon{size}.png"
        resized.save(out, format="PNG", optimize=True)
        print(f"Wrote {out.relative_to(ROOT)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
