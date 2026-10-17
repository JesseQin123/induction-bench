# Release verification

Verified in Chrome on macOS. Tests establish the behavior of the simplified model, not the accuracy of a real physical instrument.

## Reproducible build

- A fresh `npm ci` completed from the committed lockfile and project npm configuration.
- npm's installation audit reported zero known vulnerabilities at release time.
- `npm test`: **8 passing tests**, covering central-difference Faraday-law consistency, polarity/velocity reversal, turn scaling, zero induction, circuit law, opposing force, wire/core effects, bounded/repeatable motion, pause, and the complete deterministic replay.
- `npm run build`: TypeScript and Vite production build passed. Three.js produces an approximately 595 kB minified chunk; Vite's size advisory remains, with no build error.

## Actual interaction checks

- The real canvas magnet was dragged from +10.5 cm toward the coil and settled around +1.3 cm; the intermediate reading showed nonzero induced EMF.
- Pole reversal, a 400-turn winding and +2.5 V were exercised through actual controls. The current and central-field readings changed together.
- Three successive resets restored 200 turns, 0 V and +10.5 cm; exactly one WebGL canvas remained.
- Keyboard Space paused the simulation and R reset it with the scene focused.
- The reduced-motion control became pressed and remained available after reset.
- A keyboard adjustment of battery voltage during real-time replay exited replay and returned control to the user.
- At 390×844 and 768×1024 browser viewports there was no horizontal document overflow. Desktop render and captions were inspected at the default wide viewport.
- Browser error log was empty after the replay capture.

## Video

- 1,200 distinct actual browser screenshots, advanced at exactly 1/30 simulation second per frame.
- Encoded H.264 MP4: **40.000 s, 30 fps, 1,200 frames, 1712×898 encoded pixels**, about 13.1 MB.
- Full FFmpeg decode completed without errors. Chrome played through to 40 seconds with no media error.
- No generated frames, optical-flow interpolation, source-creator media, audio or private desktop content.

## Public package review

The release starts from a new Git history. The publication set contains original source, tests, documentation, MIT licensing, the application's own screenshot/video and OFL-licensed fonts. No private deployment metadata, credentials, local absolute paths, reference media, private email address, node_modules or generated build directory are included. The original hosted project remains separate.

Limitations: tested in Chrome rather than every browser/GPU; viewport resizing is not a physical-phone test. WebGL failure fallback exists, but forced context loss was not tested in this release.
