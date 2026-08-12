# Head-Tracked 3D Window

A browser experiment that turns a flat monitor into a head-coupled perspective window. A webcam estimates the viewer's eye position, then the Three.js camera uses an asymmetric projection frustum so the scene changes perspective as the viewer moves.

## What it does

- Tracks one face with MediaPipe Face Landmarker.
- Uses eye landmarks 33 and 263 plus the nose bridge to estimate horizontal, vertical, and depth movement.
- Smooths noisy measurements in a small Zustand store.
- Repositions the virtual camera and rebuilds the projection matrix every frame.
- Lets the viewer press `Space` to treat the current pose as the center point.
- Exposes a smoothing control for trading responsiveness against jitter.

This is true off-axis projection, not a scene that merely rotates toward the face. The monitor is treated as a fixed virtual window; the left, right, top, and bottom frustum planes are derived from the estimated eye position.

## Data flow

```text
webcam frame -> MediaPipe landmarks -> normalized eye position
             -> calibration + smoothing -> asymmetric frustum -> Three.js render
```

All camera processing happens in the browser. The application does not upload or save frames, but it downloads MediaPipe WebAssembly and the face-landmarker model from their public CDNs at runtime.

## Run locally

Requirements: Node.js 18+ and a browser with webcam access and WebGL.

```bash
npm install
npm run dev
```

Open the printed local URL, grant camera permission, sit near the center of the frame, and press `Space`. A secure context is required for camera access outside `localhost`.

Production build:

```bash
npm run build
npm run preview
```

## Controls

| Control | Effect |
|---|---|
| `Space` | Calibrate the current head position as center |
| Smoothing slider | Higher values reduce jitter but add lag |
| Browser camera permission | Enables or disables tracking |

## Project layout

- `src/components/HeadTracker.jsx` — webcam lifecycle and landmark inference.
- `src/components/WindowCamera.jsx` — off-axis camera/frustum calculation.
- `src/store/useHeadStore.js` — smoothing and calibration state.
- `src/components/Scene.jsx` — the demonstration scene.

## Limitations

- This is a monocular approximation, not calibrated eye tracking.
- Accuracy depends on camera placement, lighting, face visibility, and viewing distance.
- The effect is designed for one viewer and one primary display.
- Model assets require network access unless they are self-hosted and the URLs are changed.

## License

Original source and the project favicon are MIT licensed. MediaPipe, Three.js, React, and other dependencies retain their upstream licenses.
