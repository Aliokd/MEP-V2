# Antigravity Design & Guideline Rules

This project-scoped rules document defines guidelines for the MEP V2 DAW sequencer interface elements. Always apply these guidelines across all modifications and new features:

## 1. Minimal White Rotary Controllers
- **Dimensions**: All dials are styled as circular knobs of size `w-11 h-11` (44px height/width).
- **Aesthetic**: Solid white background (`bg-white`), light grey border (`border-2 border-stone-200/80`), and a soft outer drop shadow.
- **Needle Tick**: Styled as an elegant thin dark gray needle (`bg-stone-600 w-[1.5px] h-[16px]`) pivoting exactly around the center of the dial container (offset at `left-calc(50%-0.75px)`) with no vertical translation offset.
- **Container Layout**: Transparent container row wrapper of width `w-[280px]` with `px-2` padding, utilizing flex `justify-between` spacing to align perfectly with the header ticks.
- **Column Header Titles**: Controller column headers (`VOL`, `PAN`, `EQ`, `REV`, `COMP`) utilize a lighter gray font (`text-stone-400/60 font-bold`) and a more subtle indicator line (`bg-stone-200 w-[1.5px] h-3.5`) for enhanced visual elegance.

## 2. Compressor (COMP) Toggle Switch
- **Dimensions**: Sized identically to the rotary dials as a uniform `w-11 h-11` (44px) circular toggle button, placed as the final parameter control in the row (VOL -> PAN -> EQ -> REV -> COMP).
- **Tactile Switches (COMP)**: The compressor button matches the knobs' `w-11 h-11` diameter and renders as solid white (`bg-white` with dark gray label text "ON") when active, and warm light grey (`bg-[#F5F4F0]`) with a refined, sharp inner shadow (`shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.06)]`) when inactive to convey a clear tactile recessed switch state.

## 3. Instrument Dropdown Selector & Selection Pop-up
- **Trigger Active State**: When open, the trigger capsule displays `"Select track"` in a medium-weight gray font (`text-stone-400 font-medium`) and completely hides the right-aligned mockup image to prevent clutter.
- **Top-Floated Selected Option**: The currently selected instrument card dynamically floats to the very top of the popup options stack.
- **Card Selection Aesthetics**:
  - Popup container width is `w-[320px]` with `p-6` padding to prevent any text wrapping.
  - Selected card: styled with a warm sand/cream background (`bg-[#F9F8F6] border-transparent`), utilizing a lighter font weight/color (`font-semibold text-stone-600`).
  - Unselected cards: styled with a solid white background (`bg-white border-stone-200`), utilizing a medium-weight gray font (`font-medium text-stone-400`).
- **Mockup Image Scaling**: Mockup images are scaled up inside both popup option cards (`w-[155px]` wrapper) and trigger capsules (`w-[155px]` wrapper, height `h-14` offset at `top-[-6px]`) to synchronize crop scales and details pixel-for-pixel between the open and closed states:
  - Standard instruments (vocals) use a base scale of `max-w-[130%] max-h-[130%]` translated by `translate-x-3 translate-y-3`.
  - The custom option device mockup is translated rightward to nest flush with the right edge (`translate-x-[36px] translate-y-[2px]`), matching the reference design layout.
  - When custom is selected, the browser prompt is removed, and the track trigger selector card mounts a text `<input>` that allows the user to rename the track directly inside the capsule on the track card, with programmatic autoFocus when the track name is `"Custom"`. Click and mouse events on the input stop event propagation to prevent toggle dropdown events.
  - The guitar instrument mockup is translated vertically upwards (`translate-x-3 translate-y-[2px]`) to center the guitar neck/body crop.
  - The piano instrument mockup is zoomed in heavily (`max-w-[180%] max-h-[180%]`) and shifted further rightwards (`translate-x-[52px] translate-y-3`) to show more keyboard presence.
  - The synth ("saint") instrument keyboard mockup is translated further right (`translate-x-6 translate-y-3`) to sit flush with the crop boundary.
  - The drums instrument mockup is zoomed in significantly (`max-w-[165%] max-h-[165%]`) and shifted further rightwards/downwards (`translate-x-[62px] translate-y-[10px]`) to emphasize the drum kit details.

## 4. Track Row Hover & Spacing Alignment
- **Track Row Background**: Track rows feature a persistent light gray background (`bg-stone-50/70`) visible at all times.
- **Hover Background**: When a track row is hovered over, a slightly darker gray accent highlight (`hover:bg-stone-200/35`) is applied.
- **Sharp Corners**: Track rows do not feature any border radius (`rounded-none`/sharp corners) to ensure a crisp grid alignment.
- **Horizontal Padding**: Track rows, column headers row, and time ruler row all utilize a consistent `px-6` padding to ensure pixel-perfect vertical grid alignment across sections.
- **Icon Visibility**: The reorder drag handle icon (far left) and the three-dots options button (far right) are hidden by default (`opacity-0`) and fade into view (`opacity-100 duration-150`) only when the mouse hovers over that specific track row. The options button remains visible if its context dropdown menu is active.
- **Widescreen Responsive Width**: When the active tab is `studio`, the Creative Tools Panel is configured to stretch and fill the space horizontally. It utilizes `max-w-full md:max-w-[calc(100%-4rem)] xl:max-w-[1400px]` for the outer wrapper, and `max-w-full` for the inner card. This ensures that the left and right edges of the sequencer panel align pixel-for-pixel with the typing canvas content boundaries on all screen widths up to 1400px.

## 5. Songwriting Canvas UI State-Saving & Version-Control Rule
- **Automated Local Versioning**: To prevent any loss of completed changes, always commit successful changes to Git immediately after implementing and verifying a feature request.
- **Diagnostics & Health Checks**: Proactively run local Next.js builds (`npm run build` / `npm.cmd run build`) and page-load health checks (e.g., `curl http://localhost:3000/platform/create`) to verify compilation and prevent runtime exceptions (e.g. from missing function handlers) that block Fast Refresh.
- **Deploy Readiness**: Keep the codebase in a production-ready, clean compiling state at all times. Do not push changes that have not been tested or that break the local builds.

## 6. Regression Prevention & Code Preservation
- **No Unintended Overrides**: Under no circumstances should unrelated, previously implemented features or configurations be changed, reverted, or overridden.
- **Git History Checking**: Before making changes, check the git diff or log to understand the context of existing custom features (e.g., custom tempo limits, font sizes, text colors, background highlight colors like `#EDFF8E`).
- **Feature Preservation Checklist**:
  - Keep the Tap Tempo limit-free (do not revert to the default 240 BPM limit).
  - Preserve the regular weight font for lyrics input (`text-stone-700` color, `text-[30px]` desktop font size).
  - Retain the green compatibility score styling and `#EDFF8E` background highlights when lyric words are selected.
  - Maintain the dotted boundaries for chorus, verse, and bridge track elements.

## 7. State Persistence & Resilience
- **Persistent State**: Interactive content, such as lyrics written on the canvas, must persist using `localStorage` or session-safe caching. 
- **Refresh Resilience**: When the page is refreshed or the browser restarts, the user's workspace progress (text inputs, lyrics, tempo settings, selected items) must load back immediately. Do not clear the state on refresh unless explicitly requested.

## 8. Mobile & Responsive Layout Guardrails
- **Device Responsiveness**: All elements and buttons must scale down beautifully and remain fully functional on smaller desktop screens, tablets, and mobile devices.
- **Mobile Viewports**: Use dynamic viewport height (`dvh`) and width (`dvw`) values where appropriate to account for mobile browser search/address bars and toolbar states.
- **Touch-Friendly Controls**: Maintain custom touch interaction overrides (such as tap-to-edit in less than 250ms, double-tap to create phrases on canvas, 15px touch cancel threshold for scrolling, and touchdrag ghosts) to prevent default desktop browser mouse-click/drag behaviors from breaking mobile usage.
- **iOS and Safari Guard**: Ensure audio recording constraints and media device handlers support iOS/Safari behaviors (e.g., echoCancellation, noiseSuppression, sampleRate 44100, mono).

## 9. Safe Testing & Deploy Pipeline
- **Run Tests Before Deploy**: Prior to deploying, verify the platform stability by running Playwright E2E tests:
  ```bash
  npx playwright test
  ```
- **Automated Deployment**: Always deploy to production (Firebase) using the master pipeline script:
  ```powershell
  powershell ./scripts/test-and-deploy.ps1
  ```
- **Zero-Downtime Assurance**: Ensure all cross-functional flows (`Create` canvas, `Learn` curriculum, `Practice` metrics, and `Connect` feed) are operational. Inspect logs if the build or tests fail, fix the underlying issues, and verify again before final push.


