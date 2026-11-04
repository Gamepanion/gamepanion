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

## What each release carries

Each [release](https://github.com/gamepanion/gamepanion/releases) has two SBOM files (CycloneDX): `gamepanion-X.Y.Z-npm.cdx.json`, the npm packages the server ships, and `gamepanion-X.Y.Z-image.cdx.json`, everything in the image, the base's packages included. With them you can tell whether a published vulnerability is in the version you run without pulling the image.

The image in the registry carries the same SBOM and a build provenance attestation (how, from which commit and by which workflow it was built):

```sh
docker buildx imagetools inspect ghcr.io/gamepanion/gamepanion:X.Y.Z --format '{{ json .SBOM }}'
docker buildx imagetools inspect ghcr.io/gamepanion/gamepanion:X.Y.Z --format '{{ json .Provenance }}'
```

## How this repository watches for vulnerabilities

- Dependabot alerts and security updates: a pull request for a fixed version as soon as an advisory is known; patch and minor bumps merge by themselves once CI is green.
- Secret scanning with push protection: a pushed token is refused.
- CodeQL code scanning on every pull request.
- A daily audit of the production dependencies and of the published image (`.github/workflows/audit.yml`).
