from pathlib import Path

ROOT = Path(__file__).resolve().parent

HEADER_FILE = ROOT / "header.html"
FOOTER_FILE = ROOT / "footer.html"

HEADER = HEADER_FILE.read_text(encoding="utf-8").strip()
FOOTER = FOOTER_FILE.read_text(encoding="utf-8").strip()


def replace_header(html):
    start_marker = "<!-- HEADER:START -->"
    end_marker = "<!-- HEADER:END -->"

    # Already generated: replace existing static header.
    if start_marker in html and end_marker in html:
        before = html.split(start_marker, 1)[0]
        after = html.split(end_marker, 1)[1]

        return (
            before
            + start_marker
            + "\n"
            + HEADER
            + "\n"
            + end_marker
            + after
        )

    # Existing JavaScript placeholder.
    old = '<header class="site-header" id="site-header"></header>'

    if old in html:
        replacement = (
            start_marker
            + "\n"
            + HEADER
            + "\n"
            + end_marker
        )

        return html.replace(old, replacement, 1)

    return html


def replace_footer(html):
    start_marker = "<!-- FOOTER:START -->"
    end_marker = "<!-- FOOTER:END -->"

    # Already generated: replace existing static footer.
    if start_marker in html and end_marker in html:
        before = html.split(start_marker, 1)[0]
        after = html.split(end_marker, 1)[1]

        return (
            before
            + start_marker
            + "\n"
            + FOOTER
            + "\n"
            + end_marker
            + after
        )

    # Existing JavaScript placeholder.
    old = '<footer class="site-footer" id="site-footer" data-year="2026"></footer>'

    if old in html:
        replacement = (
            start_marker
            + "\n"
            + FOOTER
            + "\n"
            + end_marker
        )

        return html.replace(old, replacement, 1)

    return html


def process_file(file):
    html = file.read_text(encoding="utf-8")

    updated = replace_header(html)
    updated = replace_footer(updated)

    if updated != html:
        file.write_text(updated, encoding="utf-8")
        print(f"Updated: {file.name}")
        return True

    return False


def main():
    if not HEADER_FILE.exists():
        raise FileNotFoundError("header.html was not found.")

    if not FOOTER_FILE.exists():
        raise FileNotFoundError("footer.html was not found.")

    changed = 0

    # All normal site pages are in the repository root.
    for file in ROOT.glob("*.html"):

        # Never process the source templates themselves.
        if file.name in {"header.html", "footer.html"}:
            continue

        # Don't modify Google's verification file.
        if file.name.startswith("google") and file.name.endswith(".html"):
            continue

        if process_file(file):
            changed += 1

    print(f"Build complete. {changed} HTML file(s) updated.")


if __name__ == "__main__":
    main()
