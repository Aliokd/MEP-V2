# Canvas empty-state artwork

Backdrop for the blank-project canvas (`isNoteBlank` in `app/platform/create/page.tsx`):
an animated sky hanging from the top of the card, over a static landmark
illustration anchored to its bottom edge.

| File | Role | Used by the app |
| ---- | ---- | --------------- |
| `top-loop.mp4` | Animated sky (clouds + birds) | **Yes** |
| `Top looped.mp4` | Original export | No — source only |
| `bottom.webp` | Static landmark illustration | **Yes** |
| `Bottom.png` | Original export | No — source only |

## Why `bottom.webp` exists

`Bottom.png` is 3.1 MB and arrived visibly late on a real connection. Two things
were wrong with it: its **top 63% is fully transparent** — a large dead band
being encoded for nothing — and PNG is a poor fit for a painterly illustration.
Cropping that band away and encoding the remainder as WebP gives **283 KB, a 91%
reduction**, at a quality indistinguishable from the original when checked
side by side.

```bash
node -e "require('sharp')('Bottom.png') \
  .extract({left:0, top:965, width:2752, height:571}) \
  .webp({quality:82, alphaQuality:90}).toFile('bottom.webp')"
```

`top: 965` is the first row containing any non-transparent pixel. Re-derive it if
the illustration is re-exported — do not assume it:

```bash
node -e "const s=require('sharp');(async()=>{const{data,info}=await \
s('Bottom.png').raw().toBuffer({resolveWithObject:true});const{width,height,channels}=info;\
for(let y=0;y<height;y++){for(let x=0;x<width;x+=4){\
if(data[(y*width+x)*channels+3]>8){console.log('crop top =',y);return}}}})()"
```

Cropping is safe for the layout: the removed band was empty, the element is
bottom-anchored, and the zoom scales about `bottom center`, so the artwork moves
by a fraction of its own height regardless of how much blank space sits above it.

Note PNG is *not* the smaller format here even after cropping — re-encoding the
cropped PNG actually came out larger than the original, because PNG compresses a
uniform transparent region extremely well. The win is WebP, not the crop alone.

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
- The illustration is bottom-anchored and sized by its own aspect ratio, so the
  sky shows above it at any card height.
- Both assets are loaded eagerly (`preload="auto"` on the video,
  `loading="eager"` + `fetchPriority="high"` on the image). They are the first
  thing visible on an empty canvas, so the browser's default lazy heuristics
  make them arrive noticeably late.
- Both layers render at 50% opacity, behind everything, and are
  `pointer-events-none` so they never intercept clicks meant for the canvas.
