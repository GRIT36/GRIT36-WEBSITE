# GRIT36 MBA 1.1

A static English MBA notebook for `grit36.com/mba/`.
Deploy the `mba/` directory at the website root. No build service, database, external fonts, analytics or runtime dependencies are required.

## Contents

- `mba/`: 297 ready-to-serve HTML pages and all required assets.
- `content/site.json`: course roadmap, session descriptions and notebook captions.
- `content/s1.json` through `s6.json`: 42 English study guides.
- `content/slides.json`: 230 selected original lecture pages, source filenames and automatically extracted text.
- `tools/build.py`: regenerate HTML and the local search index using Python 3.12 or newer.
- `tools/prepare_sources.py`: render referenced original slides using `pypdfium2` and `pypdf`.

## Update the study guide

Edit the relevant session JSON file, then run:

```
python tools/build.py
```

Each topic contains a summary, a three-column framework table, distinctions, application steps, qualifications, a recall question and answer, original slide references and links to notebook pages. References use `[session number, physical PDF page number, descriptive title]`.

For new original slide references, prepare a local manifest with a `sources` array. Each object needs `key` (`S1` to `S6`) and `path` (the local original PDF path). This local manifest is not part of the deployed site.

```
python tools/prepare_sources.py /path/to/source-manifest.json
python tools/build.py
```

Rendering reads the supplied PDFs without altering them. Complete source pages are converted to approximately 2000-pixel-wide WebP images, with separate smaller thumbnails. Rendered pages include the original annotations. The slide reader preserves source filename and physical page number. Extracted text is provided as a secondary reading/search aid; it may include hidden text or omit parts of a diagram, so the original image is authoritative.

## Local preview

From this directory:

```
python -m http.server 8766 --bind 127.0.0.1
```

Open `http://127.0.0.1:8766/mba/`. The main-website footer link points outside this standalone package and becomes valid when deployed alongside the existing site.

## Content provenance

The six supplied 2023 Competitive & Corporate Strategy lecture PDFs are the primary sources. Original theory pages are linked directly to related edited English study guides; the guides are not presented as verbatim quotations or as the owner's personal conclusions. Dedicated classroom case studies are omitted. Illustrative examples already contained in the preserved theory slides remain visible.

S4 corresponds to the lecture on 27 September 2023; its source filename contains `Session5`. References are assigned to the actual session, with the filename retained in each reader.

The Five Forces guide additionally links to Harvard Business School's Institute for Strategy and Competitiveness for supplementary explanation. The original VRINO diagram has a wording inconsistency; the related guide identifies it rather than silently altering the source image.

All nine original handwritten notebook pages remain available. The unmodified source PDF is retained under `mba/assets/notes/` and its SHA-256 is documented in the upload instructions.

The existing main website is not included or modified. All version 1.0 page routes continue to exist. Other courses have clearly marked future-content pages at `/mba/courses/bn/`, `/pm/`, `/msda/`, `/sa/` and `/sub/` under the same courses directory.
