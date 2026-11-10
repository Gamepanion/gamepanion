"""MkDocs hook: serves the committed openapi.json (npm run generate, checked in CI) at reference/openapi.json, where the REST API page renders it
with Swagger UI (mkdocs-swagger-ui-tag). The routes are listed from the description itself, so a new route needs no edit of the page."""

from pathlib import Path

from mkdocs.structure.files import File

SPEC = Path(__file__).resolve().parents[1] / "openapi.json"


def on_files(files, config):
    # The German site (/de/) shows the English page, which looks for the file next to itself.
    for path in ("reference/openapi.json", "de/reference/openapi.json"):
        files.append(File.generated(config, path, abs_src_path=str(SPEC)))
    return files
