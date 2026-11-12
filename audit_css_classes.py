"""Find classes used in templates that no CSS rule targets, and CSS classes
that no template uses. Catches silently-dead styles like .camera-wrap vs .cam-wrap."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

css = (ROOT / "static" / "css" / "style.css").read_text(encoding="utf-8")
templates = {p: p.read_text(encoding="utf-8") for p in (ROOT / "templates").glob("*.html")}
js = {p: p.read_text(encoding="utf-8") for p in (ROOT / "static" / "js").glob("*.js")}

# classes defined in CSS
css_classes = set(re.findall(r"\.([a-zA-Z][\w-]*)", css))

# classes used in html (class="...") and in js (className / classList)
used = {}
for p, t in templates.items():
    for m in re.findall(r'class="([^"]*)"', t):
        for c in m.split():
            used.setdefault(c, set()).add(p.name)
for p, t in js.items():
    for m in re.findall(r'class(?:Name)?\s*=\s*"([^"]*)"', t):
        for c in m.split():
            used.setdefault(c, set()).add(p.name)
    for m in re.findall(r'classList\.(?:add|toggle|remove)\(\s*"([^"]*)"', t):
        for c in m.split():
            used.setdefault(c, set()).add(p.name)

print("== classes used in markup but with NO css rule ==")
dead = sorted(c for c in used if c not in css_classes)
for c in dead:
    print(f"  .{c:<28} used in {', '.join(sorted(used[c]))}")
if not dead:
    print("  (none)")

print("\n== css classes never used in markup ==")
unused = sorted(c for c in css_classes if c not in used)
# drop obvious utility fragments
noise = {"png", "jpg", "svg", "gif", "woff2", "ico", "css", "js"}
unused = [c for c in unused if c not in noise]
for c in unused:
    print(f"  .{c}")
if not unused:
    print("  (none)")
