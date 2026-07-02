---
name: hummingbird
description: Navigate and use Hummingbird's minimal, distroless OCI container images via the live catalog API. Find production images, write multi-stage Containerfiles, check CVEs, and inspect SBOMs.
license: Apache-2.0
allowed-tools:
  - Bash(curl -s --compressed https://api-hummingbird.hummingbird-project.io/*)
  - Bash(curl -s --compressed "https://api-hummingbird.hummingbird-project.io/*")
  - Bash(jq *)
metadata:
  author: Red Hat
  version: 1.0.0
---

# Hummingbird Image Catalog — Agent Guide

Project Hummingbird builds and publishes minimal, distroless OCI container images.
This guide teaches agents to navigate the catalog using the REST API so they always
work with current data rather than stale embedded information.

**API base URL:** `https://api-hummingbird.hummingbird-project.io`
**OpenAPI spec:** `https://api-hummingbird.hummingbird-project.io/v1/openapi.json`
**Swagger UI:** `https://api-hummingbird.hummingbird-project.io/v1/docs/`

> All API responses are gzip-compressed. Always pass `--compressed` to curl.

---

## Key Concepts

**Image name** — Short kebab-case identifier used in all API paths (e.g. `python`,
`nodejs`, `aspnet-runtime`). No registry prefix.

**Stream** — Version family within an image. Multi-version images
have one stream per major (or major.minor) release (e.g. `"24"`
and `"20"` for Node.js). Single-version images typically use
`"latest"`.

**Variant** — Build flavor of an image:

- `default` — Distroless, no shell or package manager. Use in production.
- `builder` — Adds bash, dnf, and shadow-utils. Use in the build stage of a
  multi-stage Containerfile.
- `fips` — FIPS 140-3 compliant crypto. Available on selected images.
- Additional image-specific variants may exist (e.g. `fpm-builder` for PHP).

**Canonical tag** — Version-pinned identifier used as a path parameter in detail,
SBOM, and vulnerability endpoints. Format: `{version}` for the `default` variant,
`{version}-{variant}` for all others (e.g. `3.14.4`, `3.14.4-builder`, `24.4.0-fips`).

**Superseded** — A tag is superseded when a newer tag exists for the same
stream+variant combination. Filter them out with `select(.superseded == false)`.

---

## Discovering Images

List all images with their summary, version streams, and category:

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images \
  | jq '.images[] | {name, summary, streams, application_category}'
```

Key fields in the response:

- `name` — identifier to use in subsequent API calls
- `summary` — one-line description
- `description` — longer description (may be derived from the README)
- `streams` — available version streams, sorted newest-first
- `variants` — available variant descriptions
  (`name`, `description`, `builder`, `fips`)
- `architectures` — supported CPU architectures
- `pull_url` — pull URL for the latest default tag
- `application_category` — grouping label (e.g. `"Programming Languages & Runtimes"`)

Search by category:

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images \
  | jq '.images[] | select(.application_category == "Programming Languages & Runtimes") | .name'
```

---

## Reading an Image's README

The `GET /v1/images/{name}` endpoint returns the full image README rendered as HTML
(`readme_html`). This is the primary source for usage instructions, environment
variables, and configuration examples.

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images/python \
  | jq '{summary, description, licenses, readme_html}'
```

To extract plain text from the HTML for display:

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images/python \
  | jq -r '.readme_html' | sed 's/<[^>]*>//g'
```

---

## Finding the Right Tag

List all current (non-superseded) tags for an image:

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images/nodejs/tags \
  | jq '.tags[] | select(.superseded == false) | {name, canonical, variant, stream, pull_url, architectures}'
```

Filter to a specific stream and variant:

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images/nodejs/tags \
  | jq '.tags[] | select(.superseded == false and .stream == "24" and .variant == "default")'
```

Key tag fields:

- `name` — human-readable tag (e.g. `latest`, `3.14.4`, `24-builder`)
- `canonical` — version-pinned tag used in detail/SBOM/vulnerability endpoints
- `pull_url` — full pull URL including registry and tag
- `digest` — manifest list digest (sha256:...) for pinned references
- `sizes` — compressed image size per architecture (bytes)

---

## Container Configuration

Get entrypoint, default command, exposed ports, environment variables, and user
for a specific tag (per architecture):

```bash
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/python/details/3.14.4" \
  | jq 'to_entries[] | {arch: .key, user: .value.user, entrypoint: .value.entrypoint, cmd: .value.cmd, env: .value.env, exposed_ports: .value.exposed_ports}'
```

Key `ArchDetails` fields:

- `user` — UID the container runs as (typically `65532` for non-root)
- `entrypoint` / `cmd` — container startup configuration
- `env` — environment variables set in the image
- `exposed_ports` — declared network ports
- `working_dir` — default working directory
- `source_repo` / `source_commit` — git provenance
- `slsa_level` — supply chain security level (e.g. `"SLSA Build L3"`)
- `build_system` — build platform (e.g. `"Konflux CI"`)

---

## Checking Vulnerabilities

### CVE stats across all images (latest tags)

"Latest tags" in catalog terms means **non-superseded** tags — the most recent tag
for each stream+variant combination. The catalog-wide endpoint pre-computes CVE
statistics across all non-superseded tags and is the most efficient way to answer
questions like "what are the CVE stats for all images?":

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/vulnerabilities \
  | jq '{computed_at, summary, cves: [.cves[] | {id, severity}]}'
```

The response includes:

- `summary` — aggregate severity counts (critical, high, medium, low) and scan stats
- `tags` — integer-indexed **array** of tag objects, each with
  `{image, stream, variant, canonical}` fields
- `cves` — deduplicated CVEs sorted by priority; each CVE's
  `affected` field is an **array of integer indices** into
  `tags` (not canonical strings)

Note: severity values use title case — `"Critical"`, `"High"`, `"Medium"`, `"Low"`.

To get a per-image breakdown of CVE counts, join on the integer indices in `affected`:

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/vulnerabilities \
  | jq '
    .tags as $tags | .cves as $cves |
    ($tags | map(.image) | unique) | map(
      . as $img |
      ([$tags | to_entries[] | select(.value.image == $img) | .key]) as $idxs |
      [$cves[] | select(.affected | any(. as $a | $idxs | any(. == $a)))] as $img_cves |
      {
        image: $img,
        critical: [$img_cves[] | select(.severity == "Critical")] | length,
        high:     [$img_cves[] | select(.severity == "High")]     | length,
        medium:   [$img_cves[] | select(.severity == "Medium")]   | length,
        low:      [$img_cves[] | select(.severity == "Low")]      | length,
        total:    ($img_cves | length)
      }
    ) | sort_by(-.total)
  '
```

### Extract affected packages from all CVEs (global endpoint)

The global `/v1/vulnerabilities` endpoint includes a `components` array on every CVE
entry — **do not query per-image endpoints** to get component names. Each component
`name` is in `packagename@version` format. Strip the `@version` suffix to get the
package name.

Component names are **binary** RPM package names, not source RPM names. Non-RPM
components also appear (Go modules with `/` in the name, npm packages, .NET
assemblies) and should be filtered when only RPMs are needed.

Extract all unique binary package names from all CVEs in one call:

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/vulnerabilities \
  | jq -r '[.cves[].components[].name | split("@")[0]] | unique | sort | .[]'
```

### CVEs for a specific tag

```bash
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/python/vulnerabilities/3.14.4" \
  | jq '{scanned_at, scanner, summary}'
```

List individual CVEs with severity and affected components:

```bash
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/python/vulnerabilities/3.14.4" \
  | jq '.vulnerabilities[] | {id, severity, description, components: [.components[].name]}'
```

---

## SBOM (Package Contents)

Package counts per architecture:

```bash
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/python/sbom/3.14.4" \
  | jq 'to_entries[] | {arch: .key, runtime: .value.runtime_count, build: .value.build_count}'
```

Search for a specific package:

```bash
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/python/sbom/3.14.4" \
  | jq 'to_entries[] | {arch: .key, matches: [.value.packages[] | select(.name | contains("openssl")) | {name, evr, license}]}'
```

SBOM package fields: `name`, `evr` (version), `package_type` (rpm/golang/pypi/npm/…),
`license`, `purl`, `cpes`, `category` (runtime/build/source).

---

## Release History

Browse the history of a specific stream and variant:

```bash
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/nodejs/history/24/default" \
  | jq '.releases[] | {digest, oldest_created, architectures, source_commit}'
```

Access immutable historical data by digest (responses are cached for one year):

```bash
# Historical container config
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/nodejs/releases/details/{digest}"

# Historical SBOM
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/nodejs/releases/sbom/{digest}"

# Historical CVEs
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/nodejs/releases/vulnerabilities/{digest}"
```

---

## Common Workflows

### Find the right production image for a language or runtime

1. List images and filter by name or category:

   ```bash
   curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images \
     | jq '.images[] | select(.name | startswith("python")) | {name, summary, streams}'
   ```

2. Read the README to understand usage and configuration:

   ```bash
   curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images/python \
     | jq -r '.readme_html' | sed 's/<[^>]*>//g'
   ```

3. Pick the non-superseded `default` tag for the stream you need:

   ```bash
   curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images/python/tags \
     | jq '.tags[] | select(.superseded == false and .variant == "default" and .stream == "3.14")'
   ```

4. Use the `pull_url` from the result, or pin by `digest` for reproducibility.

### Write a multi-stage Containerfile

Use the `builder` variant for the build stage and `default` for the final stage:

```dockerfile
FROM <pull_url of builder tag> AS build
# build steps — dnf, bash, and shadow-utils are available here

FROM <pull_url of default tag>
COPY --from=build /app /app
```

Fetch pull URLs for both stages:

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images/golang/tags \
  | jq '.tags[] | select(.superseded == false and .stream == "1.24") | {variant, pull_url}'
```

### Check if an image has a FIPS variant

```bash
curl -s --compressed https://api-hummingbird.hummingbird-project.io/v1/images/python/tags \
  | jq '[.tags[] | select(.superseded == false and (.variant | startswith("fips")))] | length'
```

A result greater than `0` means FIPS variants are available.

### Verify supply chain provenance

```bash
curl -s --compressed "https://api-hummingbird.hummingbird-project.io/v1/images/python/details/3.14.4" \
  | jq 'to_entries[0].value | {source_repo, source_commit, slsa_level, build_system, containerfile}'
```

---

## Source Repository

> **Always prefer the REST API over the source repository.**
> The API returns current, pre-processed data and requires no
> authentication or local checkout. Only consult the source
> repository when you specifically need to read or modify the
> build definition, package selection, or documentation
> templates — and only if the repository is already checked
> out locally. Do not clone it.

For source-level exploration of image definitions (Containerfiles, package selection,
README templates, test definitions), see the upstream containers repository:

`https://gitlab.com/redhat/hummingbird/containers`

Per-image layout within that repository:

```text
images/{name}/
├── properties.yml        # image metadata: summary, description, streams, variants, rpm_packages
├── README.md.j2          # Jinja2 template rendered into the readme_html served by the API
├── Containerfile.j2      # Jinja2 template for the container build
└── {distro}/{variant}/
    ├── Containerfile     # rendered Containerfile
    ├── rpms/rpms.lock.yaml  # pinned RPM versions
    └── TAGS              # tag names produced by this build
```

`properties.yml` is the authoritative source for `application_category`, `summary`,
`description`, `rpm_packages`, `stream`, and `additional_variants`. The `README.md.j2`
template is what generates the `readme_html` field returned by the API.

Use the API (`GET /v1/images/{name}`) for current runtime data. Use the source
repository when you need to understand or modify the build definition, package
selection, or documentation templates.
