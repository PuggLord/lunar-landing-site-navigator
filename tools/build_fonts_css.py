"""
Writes css/fonts.css: the page's typeface stored inside the stylesheet, so the
page still opens straight from disk with no server and no network.

The font is Mona Sans (GitHub, SIL Open Font License 1.1), the Latin subset
that Google Fonts serves. The file and its license sit in vendor/fonts/.

SI disclosure: this script was written with an AI coding tool (Claude Code,
Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
directed and reviewed by team Ksig UNT. See SI_USE.md.

Usage (Python 3.11 or newer, no packages):

    python tools/build_fonts_css.py
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = ROOT / "vendor" / "fonts" / "MonaSans-latin-variable.woff2"
OUT = ROOT / "css" / "fonts.css"

HEADER = """/*
 * Mona Sans, copyright 2023 GitHub, SIL Open Font License 1.1.
 * License text: vendor/fonts/OFL-MonaSans.txt
 * Built by tools/build_fonts_css.py from vendor/fonts/MonaSans-latin-variable.woff2.
 * Do not edit by hand.
 */
"""


def main():
    data = base64.b64encode(FONT.read_bytes()).decode("ascii")
    css = (
        HEADER
        + "@font-face {\n"
        + '  font-family: "Mona Sans";\n'
        + "  font-style: normal;\n"
        + "  font-weight: 200 900;\n"
        + "  font-stretch: 75% 125%;\n"
        + "  font-display: swap;\n"
        + '  src: url("data:font/woff2;base64,' + data + '") format("woff2");\n'
        + "}\n"
    )
    OUT.write_text(css, encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(css) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
