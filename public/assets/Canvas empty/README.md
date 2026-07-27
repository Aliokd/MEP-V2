# Canvas empty-state artwork

Backdrop for the blank-project canvas (`isNoteBlank` in `app/platform/create/page.tsx`):
an animated sky hanging from the top of the card, over a static landmark
illustration anchored to its bottom edge.

| File | Role | Used by the app |
| ---- | ---- | --------------- |
| `top-loop.mp4` | Animated sky (clouds + birds) | **Yes** |
| `Top looped.mp4` | Original export | No — source only |
| `Bottom.png` | Static landmark illustration | **Yes** |

## Why `top-loop.mp4` exists

The original export has 1–2 pixel rows of near-black baked into its top and
bottom edges. They were invisible while the video was cropped by `object-cover`,
but showed up as two thin horizontal lines across the canvas as soon as the
layout changed to show the whole frame. Successive CSS workarounds (negative
offsets, `scale-105`) each hid them only for one particular set of dimensions.

`top-loop.mp4` is the original with those edges cropped away and the silent
audio track dropped, which also cut the file from 928 KB to 413 KB:

```bash
ffmpeg -i "Top looped.mp4" -vf "crop=iw-8:ih-8:4:4" \
  -c:v libx264 -crf 21 -preset veryslow -pix_fmt yuv420p \
  -movflags +faststart -an top-loop.mp4
```

Re-run that if the source is ever re-exported. If the new export has clean
edges, point the component straight at it and drop the derivative.

**`-movflags +faststart` is not optional.** Without it ffmpeg writes the `moov`
atom (the index the decoder needs) *after* all the media data, so a browser has
to download the entire file before it can render a single frame — which showed
up as a stutter through the opening second. With it, `moov` sits up front and
playback starts on the first buffered chunk. Verify with:

```bash
node -e "const b=require('fs').readFileSync('top-loop.mp4');let o=0,r=[];\
while(o<b.length-8){const s=b.readUInt32BE(o);if(s<8)break;\
r.push(b.toString('ascii',o+4,o+8));o+=s}console.log(r.join(' -> '))"
# want: ftyp -> moov -> ... -> mdat   (moov BEFORE mdat)
```

**On CRF:** 21 is the sweet spot here — frame-for-frame indistinguishable from
19 on this artwork (flat white with sparse line detail) while being ~22%
smaller. Do not push far past it: an earlier pass used CRF 24, which halved the
bitrate to ~410 kbps and was a real quality regression.

## Notes

- The video loops continuously at **half speed** (`playbackRate = 0.5`, set on the
  node at mount — see the comment in `page.tsx` for why not `onLoadedMetadata`),
  so the motion drifts rather than bustles behind the writing.
- Its artwork occupies only the top ~44% of the frame; everything below is blank
  white. That is why the element can be pulled above the card's top edge to raise
  where the birds sit without cropping anything visible.
- It is **capped at its native 1272px width** and centred. Stretching a 720p
  source across a wider canvas is what made it look soft — on a high-DPI screen
  that is roughly a 2.8x upscale. Held at native size it stays sharp, and the
  artwork reads smaller (more sky, less zoom). The margins this leaves on wide
  screens are invisible because the video's background and the card are both
  white. Raising this cap trades sharpness for scale; it cannot add detail the
  720p source does not have.
- `Bottom.png` is transparent above the illustration itself, so anchoring it to
  the bottom lets the sky show through above it at any card height.
- Both layers render at 50% opacity, behind everything, and are
  `pointer-events-none` so they never intercept clicks meant for the canvas.
