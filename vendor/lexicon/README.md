# Lexicon source data

Source data for the offline Norwegian/Swedish rhyme + synonym engine used by
`app/api/lexicon/route.ts`. These files are inputs to `scripts/build-lexicon.mjs`,
which generates the compact indexes the API route actually loads.

Nothing here (or generated from it) is ever sent to the browser. The API route
returns only individual matching words. See the licensing note below — that
boundary is deliberate.

## Word lists

Supplied by devDependencies, expanded with their affix rules at build time so
inflected forms (`dröm` → `drömmar`, `drömmen`) are rhymable:

| Language | Package         | License   |
| -------- | --------------- | --------- |
| Swedish  | `dictionary-sv` | LGPL-3.0  |
| Bokmål   | `dictionary-nb` | GPL-2.0   |

## Pronunciation lexicons (NOT vendored — auto-downloaded)

Swedish and Norwegian rhymes are phoneme-keyed using the **NST pronunciation
lexicons** (SAMPA transcriptions, ~650k inflected forms per language), published
by Språkbanken at the National Library of Norway and distributed as freely
available resources (CC0-style, no usage restrictions):
<https://www.nb.no/sprakbanken/>

The raw `.pron` files are ~180 MB each, so `nst/` is **gitignored**;
`scripts/build-lexicon.mjs` downloads and unpacks them on demand. The generated
indexes in `lib/lexicon/data/` are committed, so CI never needs the download.

## Frequency lists (vendored in `freq/`)

`sv_50k.txt` / `no_50k.txt` from the FrequencyWords project (MIT licence),
derived from the OpenSubtitles corpus:
<https://github.com/hermitdave/FrequencyWords>
Used to rank rhyme/synonym results by how common a word actually is.

## Thesauri (vendored here)

MyThes format, as shipped with LibreOffice.

- `th_sv_SE.dat` — converted from **Synlex**, © Viggo Kann, KTH 2009.
  Permissive: use or copy for any purpose provided the copyright notice is
  retained. <https://folkets-lexikon.csc.kth.se/synlex.html>
- `th_nb_NO.dat` — from the LibreOffice `no` dictionary bundle. **GPL-2.0.**

## Licensing note

The Norwegian data is GPL-2.0 and the Swedish word list is LGPL-3.0. Both are
used **server-side only** and are never bundled into client-side JavaScript or
served as static assets.

That distinction is what keeps this compatible with a closed-source commercial
product: GPL-2.0 obligations attach to *distributing* the work, and running it
on a server to answer queries is not distribution. Shipping these word lists to
the browser (e.g. moving them under `public/`, or importing them from a client
component) **would** be distribution and would change the obligations.

Keep the data server-side.
