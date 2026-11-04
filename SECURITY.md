# Security policy

## Reporting a vulnerability

Report it privately through [**Report a vulnerability**](https://github.com/gamepanion/gamepanion/security/advisories/new) on this repository's Security tab. Please do not open a public issue for it.

This covers the server, the image `ghcr.io/gamepanion/gamepanion`, and the hosted service at gamepanion.app.

Helpful in a report: the version or image tag, how the instance is configured as far as it matters, and the steps that show the problem.

You get an answer within seven days. Once a fix is released, the advisory is published and names you, unless you would rather not be named.

## Supported versions

Security fixes go into a new release, and only the newest release gets them. There are no backports to older versions.

| Version                                                                 | Security fixes                    |
| ----------------------------------------------------------------------- | --------------------------------- |
| newest release (`:latest`, and the `:X` and `:X.Y` tags that follow it) | yes                               |
| anything older                                                          | no: upgrade to the newest release |
