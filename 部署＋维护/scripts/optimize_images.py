from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[2]
SITE_JSON = ROOT / "src" / "content" / "site.json"
PUBLIC = ROOT / "public"
MAX_EDGE = 2200
TARGET_MAX_BYTES = 550_000
WEBP_QUALITY = 82
JPEG_QUALITY = 84


def collect_paths(value, result):
    if isinstance(value, dict):
        for child in value.values():
            collect_paths(child, result)
    elif isinstance(value, list):
        for child in value:
            collect_paths(child, result)
    elif isinstance(value, str) and value.startswith("/images/"):
        result.add(value)


content = json.loads(SITE_JSON.read_text(encoding="utf-8"))
paths = set()
collect_paths(content, paths)

meta = {}
changes = []
for public_path in sorted(paths):
    file_path = PUBLIC / public_path.lstrip("/")
    if not file_path.exists() or file_path.suffix.lower() not in {".webp", ".jpg", ".jpeg", ".png"}:
        continue

    before = file_path.stat().st_size
    with Image.open(file_path) as image:
        image.load()
        width, height = image.size
        longest = max(width, height)
        needs_resize = longest > MAX_EDGE
        needs_recompress = before > TARGET_MAX_BYTES
        if needs_resize:
            scale = MAX_EDGE / longest
            image = image.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.Resampling.LANCZOS)
            width, height = image.size

        if needs_resize or needs_recompress:
            suffix = file_path.suffix.lower()
            if suffix == ".webp":
                image.save(file_path, "WEBP", quality=WEBP_QUALITY, method=6)
            elif suffix in {".jpg", ".jpeg"}:
                if image.mode not in ("RGB", "L"):
                    image = image.convert("RGB")
                image.save(file_path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            elif suffix == ".png":
                image.save(file_path, "PNG", optimize=True)

    after = file_path.stat().st_size
    meta[public_path] = {"width": width, "height": height}
    if after != before:
        changes.append((public_path, before, after))

content["imageMeta"] = dict(sorted(meta.items()))
SITE_JSON.write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

for path, before, after in changes:
    print(f"{path}: {before / 1024:.0f} KB -> {after / 1024:.0f} KB")
print(f"IMAGE_META_SAVED {len(meta)}")
