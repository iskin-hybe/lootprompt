#!/usr/bin/env python3
"""Download lootprompt.com media and rebuild the local data snapshot.

Usage:
  LOOTPROMPT_ANON_KEY=<publishable key from the site's JS> \
    python3 scripts/lootprompt/fetch-assets.py

The publishable key ships in lootprompt.com's client bundle (supabase-js `apikey`
header). Requires curl and ffmpeg. Writes to public/sites/lootprompt and
src/components/sites/lootprompt/data.
"""
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PUB = os.path.join(ROOT, "public", "sites", "lootprompt")
DATA = os.path.join(ROOT, "src", "components", "sites", "lootprompt", "data")
SUPABASE = "https://dfwqsyalprftvqwrtjkh.supabase.co"
STORAGE = f"{SUPABASE}/storage/v1"
PROMPT_FIELDS = (
    "id,title,category,model,pipeline_info,prompt_text,media_url,media_type,poster_url,"
    "created_at,copy_count,reel_url,brand_id,ig_likes,media_width,media_height,prompt_blocks,"
    "prompt_references(id,type,url,label,sort_order)"
)


def api(path, body=None):
    key = os.environ["LOOTPROMPT_ANON_KEY"]
    req = urllib.request.Request(
        f"{SUPABASE}/rest/v1/{path}",
        data=None if body is None else json.dumps(body).encode(),
        headers={"apikey": key, "content-type": "application/json"},
        method="GET" if body is None else "POST",
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def base(key):
    return os.path.splitext(os.path.basename(key))[0]


def download(url, dest):
    if os.path.exists(dest):
        return
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    subprocess.run(["curl", "-sS", "--retry", "3", "-o", dest, url], check=True)


def image_ext(path):
    with open(path, "rb") as f:
        head = f.read(8)
    return "png" if head.startswith(b"\x89PNG") else "jpg"


def fetch_image(url, folder, name):
    """Render-endpoint images come back as JPEG/PNG without an image/webp Accept header."""
    tmp = os.path.join(PUB, folder, name + ".download")
    for ext in ("jpg", "png"):
        if os.path.exists(os.path.join(PUB, folder, f"{name}.{ext}")):
            return f"/sites/lootprompt/{folder}/{name}.{ext}"
    download(url, tmp)
    ext = image_ext(tmp)
    os.replace(tmp, os.path.join(PUB, folder, f"{name}.{ext}"))
    return f"/sites/lootprompt/{folder}/{name}.{ext}"


def fetch_motion(key):
    """GIF media is re-encoded to H.264 MP4 (about 5x smaller at similar quality)."""
    name = base(key)
    out = os.path.join(PUB, "motion", f"{name}.mp4")
    if not key.endswith(".gif"):
        return None
    if not os.path.exists(out):
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with tempfile.TemporaryDirectory() as tmp:
            gif = os.path.join(tmp, "in.gif")
            download(f"{STORAGE}/object/public/media/{key}", gif)
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", gif, "-movflags", "+faststart",
                 "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                 "-c:v", "libx264", "-crf", "29", "-preset", "slow", "-an", out],
                check=True,
            )
    return f"/sites/lootprompt/motion/{name}.mp4"


def orientation(w, h):
    if not w or not h or w <= 0 or h <= 0:
        return {"width": None, "height": None, "ratio": 9 / 16, "orientation": "portrait"}
    r = w / h
    kind = "landscape" if r >= 1.2 else "portrait" if r <= 0.85 else "square"
    return {"width": w, "height": h, "ratio": r, "orientation": kind}


def main():
    rows = api(f"prompts?select={PROMPT_FIELDS}&deleted_at=is.null&order=created_at.desc")
    prompts = []
    for row in rows:
        poster_key = (row["poster_url"] or "")[6:]
        poster = fetch_image(
            f"{STORAGE}/render/image/public/media/{poster_key}?width=720&quality=70",
            "posters", base(poster_key),
        ) if poster_key else None
        media_key = (row["media_url"] or "")[6:]
        motion = fetch_motion(media_key) if media_key else None
        src = poster
        if media_key and not motion:
            src = f"/sites/lootprompt/posters/media-{base(media_key)}.jpg"
            download(f"{STORAGE}/object/public/media/{media_key}", os.path.join(ROOT, "public", src.lstrip("/")))
        refs = []
        for ref in sorted(row.get("prompt_references") or [], key=lambda r: r["sort_order"]):
            key = ref["url"][6:]
            if ref["type"] == "image":
                ref_src = fetch_image(
                    f"{STORAGE}/render/image/public/media/{key}?width=144&height=144&resize=cover&quality=65",
                    "refs", base(key),
                )
            else:
                ref_src = f"{STORAGE}/object/public/media/{key}"
            refs.append({"id": ref["id"], "type": ref["type"] or "image", "src": ref_src, "label": ref["label"]})
        blocks = [b for b in (row.get("prompt_blocks") or []) if (b or {}).get("text", "").strip()]
        prompts.append({
            "id": row["id"], "title": row["title"], "category": row["category"], "model": row["model"],
            "pipelineInfo": row["pipeline_info"],
            "media": {
                "type": "video" if row["media_type"] == "video" else "image",
                "motion": motion, "src": src, "poster": poster,
                "width": row["media_width"], "height": row["media_height"],
            },
            "aspect": orientation(row["media_width"], row["media_height"]),
            "prompt": blocks[-1]["text"] if blocks else row["prompt_text"],
            "blockCount": len(blocks) if blocks else 1,
            "references": refs,
            "createdAt": row["created_at"], "copyCount": row["copy_count"] or 0,
            "reelUrl": row["reel_url"], "brandId": row["brand_id"], "igLikes": row["ig_likes"],
            "hasStoredReel": False,
        })

    aggregates = api("rpc/public_home_aggregates", {})
    for brand in aggregates["brands"]:
        logo = brand["logo_url"]
        if logo and logo.startswith("media:"):
            download(f"{STORAGE}/object/public/media/{logo[6:]}", os.path.join(PUB, logo[6:]))
            brand["logo_url"] = f"/sites/lootprompt/{logo[6:]}"

    os.makedirs(DATA, exist_ok=True)
    outputs = {
        "prompts.json": prompts,
        "home-aggregates.json": aggregates,
        "heist-report.json": api("rpc/public_heist_report", {}),
        "job-board.json": api("rpc/job_board_teaser", {}),
        "thieves.json": {
            f"{period}-{limit}": api("rpc/top_thieves_board", {"_period": period, "_limit": limit})
            for period in ("month", "all") for limit in (3, 50)
        },
    }
    for name, value in outputs.items():
        with open(os.path.join(DATA, name), "w", encoding="utf-8") as f:
            json.dump(value, f, ensure_ascii=False, indent=1)
    print(f"{len(prompts)} prompts written", file=sys.stderr)


if __name__ == "__main__":
    main()
