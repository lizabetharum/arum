#!/usr/bin/env python3
"""Strip Claude's frame runtime from an exported artifact.

The wrapper is not the author's content and is broken outside claude.ai: the
<base href> repoints every relative URL in the page, and the runtime script
speaks postMessage to a shell that is not there. Everything else is left exactly
as written, so an ordinary page comes back byte-identical.

Usage:  clean_artifact.py <input.html> [output.html]
"""
import re
import sys


def clean(html: str):
    removed = []

    def strip(pattern, label):
        nonlocal html
        new = re.sub(pattern, "", html, flags=re.S | re.I)
        if new != html:
            removed.append(label)
            html = new

    strip(r"<!--\s*frame-runtime\s*-->.*?<!--\s*/frame-runtime\s*-->", "Claude frame runtime")
    strip(r"<base\b[^>]*>", "<base> tag")
    strip(r'<link[^>]*\bhref=["\']chrome-extension://[^"\']*["\'][^>]*>', "extension stylesheets")
    strip(r"<grammarly-([a-z-]+)\b[^>]*>.*?</grammarly-\1>", "Grammarly markup")
    strip(r"<grammarly-[a-z-]+\b[^>]*/?>", "Grammarly markup")
    return html, sorted(set(removed))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else src

    original = open(src, encoding="utf-8").read()
    cleaned, removed = clean(original)
    open(out, "w", encoding="utf-8").write(cleaned)

    # The checks that decide whether this file is usable. A loader shell is the
    # one failure that cannot be fixed by cleaning, so it is called out loudly.
    shell = "data-frame-uuid" in cleaned or "frame.claudeusercontent.com" in cleaned
    # Computed outside the f-string: a backslash in an f-string expression is a
    # syntax error before Python 3.12, and this script should run anywhere.
    bases = len(re.findall(r"<base\b", cleaned, re.I))
    has_body = "<body" in cleaned.lower()
    print(f"wrote {out}  ({len(original)/1024:.1f} KB -> {len(cleaned)/1024:.1f} KB)")
    print("removed: " + (", ".join(removed) if removed else "nothing"))
    print(f"<base> tags remaining: {bases}")
    print(f"has a <body>: {has_body}")
    if shell:
        print("PROBLEM: this is the loader shell, not the artifact — it has no content.")
        print("         Re-read the artifact; do not hand this file over.")
        sys.exit(1)


if __name__ == "__main__":
    main()
