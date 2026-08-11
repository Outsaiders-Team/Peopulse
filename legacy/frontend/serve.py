#!/usr/bin/env python3
"""Static frontend with live browser reload on file changes."""
from __future__ import annotations

import os
import sys

from livereload import Server
from tornado.web import StaticFileHandler


class NoCacheStaticFileHandler(StaticFileHandler):
    """Disables browser caching so edits always show up on reload.

    The default handler lets browsers reuse a stale copy of JS/HTML
    fragments between live-reloads, which then 404s on renamed/removed
    files and breaks the app with a stale-cache error that looks like a
    real bug. Not for production use.
    """

    def set_extra_headers(self, path: str) -> None:
        self.set_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")


def main() -> None:
    host = os.environ.get("FRONTEND_HOST", "127.0.0.1")
    port = int(os.environ.get("FRONTEND_PORT", "3456"))
    root = os.path.dirname(os.path.abspath(__file__))

    server = Server()
    server.SFH = NoCacheStaticFileHandler
    # Reload on any frontend asset change (HTML/CSS/JS/components/assets).
    server.watch(os.path.join(root, "**", "*"))
    server.serve(root=root, host=host, port=port, open_url_delay=None)


if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("livereload not found. Run ./run from the repo root.", file=sys.stderr)
        sys.exit(1)
