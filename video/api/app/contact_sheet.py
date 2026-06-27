from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from app.models import ContactSheet, CropCandidate
from app.utils.files import write_json


def _chunks(items: list[CropCandidate], size: int) -> list[list[CropCandidate]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def make_contact_sheets(
    *,
    candidates: list[CropCandidate],
    job_dir: str | Path,
    sheet_size: int = 12,
) -> list[ContactSheet]:
    base = Path(job_dir)
    sheets_dir = base / "sheets"
    sheets_dir.mkdir(parents=True, exist_ok=True)

    cols = 4
    rows = math.ceil(sheet_size / cols)
    tile_w = 240
    tile_h = 340
    label_h = 62
    font = _load_label_font()

    sheets: list[ContactSheet] = []
    for sheet_index, batch in enumerate(_chunks(candidates, sheet_size), start=1):
        sheet = Image.new("RGB", (cols * tile_w, rows * tile_h), "white")
        draw = ImageDraw.Draw(sheet)

        for tile_index, cand in enumerate(batch):
            col = tile_index % cols
            row = tile_index // cols
            x = col * tile_w
            y = row * tile_h
            draw.rectangle((x, y, x + tile_w - 1, y + tile_h - 1), outline=(190, 190, 190), width=1)
            draw.text((x + 10, y + 8), f"{cand.crop_id}\n{cand.timestamp_label}", fill="black", font=font)

            crop = Image.open(cand.crop_path).convert("RGB")
            crop.thumbnail((tile_w - 20, tile_h - label_h - 20))
            paste_x = x + (tile_w - crop.width) // 2
            paste_y = y + label_h + ((tile_h - label_h) - crop.height) // 2
            sheet.paste(crop, (paste_x, paste_y))

        sheet_id = f"sheet_{sheet_index:06d}"
        sheet_path = sheets_dir / f"{sheet_id}.jpg"
        sheet.save(sheet_path, quality=90)
        sheets.append(
            ContactSheet(
                sheet_id=sheet_id,
                sheet_path=str(sheet_path),
                crop_ids=[cand.crop_id for cand in batch],
            )
        )

    write_json(base / "sheets.json", [sheet.model_dump() for sheet in sheets])
    return sheets


def _load_label_font() -> ImageFont.ImageFont:
    for font_path in [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]:
        path = Path(font_path)
        if path.exists():
            return ImageFont.truetype(str(path), 22)
    return ImageFont.load_default()
