"""MkDocs hook: keeps the ADRs' MADR `status` out of Material's page status.

Material for MkDocs reads a page's `status:` front matter as a page status (`new`, `deprecated`) and shows an unknown one,
like MADR's `accepted` or `superseded by …`, as an info icon in the sidebar (#71). The front matter stays MADR; the page
just doesn't hand it to the theme. "(superseded)" is in the nav title already.
"""


def on_page_markdown(markdown, page, config, files):
    if page.file.src_uri.startswith("adr/"):
        page.meta.pop("status", None)
    return markdown
