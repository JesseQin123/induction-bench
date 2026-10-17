# Demo provenance and reproduction

`media/induction-bench-demo.mp4` is a **40-second, 30 fps** capture of this real application, with English captions rendered by the application. It shows continuous magnet drag, pole reversal, coil turns/core/material/angle, positive and negative battery voltage, and faster motion. The field scene, analog meter, digital readings and graphs all use the same model state.

This is a **deterministic input replay captured offline**, not a claim of a human operating the mouse in real time. The drag segment calls the same `moveMagnet` controller used by the actual canvas pointer handler, position slider and keyboard. The pale ring identifies the scripted drag target; it is not a fabricated system cursor.

For each video frame, the application executes four ordinary 1/120 s model steps. Chrome renders the resulting DOM, SVG graphs and Three.js scene. A fresh viewport screenshot is then saved. All 1,200 source images have distinct SHA-256 hashes. One initially repeated browser-capture frame was re-captured at its exact deterministic state. No optical-flow interpolation, duplicated-frame upsampling, generated imagery or externally fabricated readings are used. Capture duration is independent of the video's simulation duration.

## Reproduce

1. Run the app and open `/?replay=1` for real-time playback.
2. For lossless timing, open `/?replay=frames`. Focus the 3D scene with Tab and press `.` to advance exactly one 1/30 s frame. The sequence is in `src/demo.ts`.
3. Capture frames 0 through 1199, waiting for `.scene-render[data-rendered-frame="N"]` before each screenshot. Capture software should wait for a compositor frame if it returns a cached image. Keep the viewport constant.
4. Encode the actual frame images with FFmpeg, without interpolation:

```sh
ffmpeg -framerate 30 -start_number 0 -i capture-frames/%04d.jpg \
  -frames:v 1200 -vf 'scale=trunc(iw/2)*2:trunc(ih/2)*2' \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -movflags +faststart -an docs/media/induction-bench-demo.mp4
```

The checked-in video is 1712×898 H.264, with no audio. The two-pixel alignment is for codec compatibility. [Visible state samples](demo-capture.json) record the actual DOM readouts once per simulation second. The browser captured only the application viewport, excluding browser tabs, desktop contents and personal information.

Numerical tests check replay repeatability, all finite outputs, drag velocity, parameter transitions, bounded motion and exact 40-second simulation duration. Interactive behavior is checked separately from the replay.
