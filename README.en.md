<p align="center">
  <img src="media/images/spacetime-cover.png" alt="Spacetime Lab: a conceptual illustration of a light clock, light cones, and curvature" width="100%">
</p>

<h1 align="center">Spacetime Lab</h1>
<p align="center"><strong>Change one variable. Discover what changes.</strong><br>Six interactive 3D relativity experiments for high-school learners and curious minds.</p>
<p align="center"><a href="README.md">中文</a> · English · <a href="media/video/spacetime-lab-demo.mp4">Watch the 64-second demo</a> · <a href="#run-locally">Run locally</a></p>

---

Why does a moving clock tick more slowly? Why does light bend near a star even though it has no rest mass?

Rotate a light cone, change a light clock's speed, compare energy bars, and explore light bending. Each experiment begins with a question and connects **what you see → what you measure → what the equation means**.

## See it in action

[![Actual app recording: causal boundaries in a light cone](media/video/spacetime-lab-preview.gif)](media/video/spacetime-lab-demo.mp4)

**[Full MP4 demo](media/video/spacetime-lab-demo.mp4)** · 1080p / 64 seconds / Chinese and English captions / no narration  
[Download bilingual subtitles](media/subtitles/spacetime-lab-demo.zh-en.srt)

The animation and video are recordings of the working app. The ChatGPT-generated cover is a conceptual illustration. Recording mode simplifies the layout; the full app also includes quizzes and source links. If GitHub does not play the MP4 inline, open its file page and download it.

![Actual app interface: the light-cone experiment](media/images/app-preview.png)

## Six experiments. One learning journey.

| Experiment | Try this | Explore |
| --- | --- | --- |
| 01 Space & events | Change position and record the time | An event needs both position and time |
| 02 Light cones & causality | Select events in different regions | Light speed limits which events can be connected |
| 03 Light clocks & time | Change speed and observer frame | Comparing a moving clock across reference frames |
| 04 Mass & energy | Change mass and speed | Rest energy, total energy, and kinetic energy |
| 05 Spacetime curvature | Change the illustrative depression | Building geometric intuition with a 2D analogy |
| 06 Light bending | Change mass and passing distance | Comparing deflection in the weak-field approximation |

Try the light clock at **0.8c**: pause, reset, and step forward ten times. The ground clock reads **10 seconds**; the moving clock reads **6 seconds**.

## Built for teaching and exploration

- Switch between **Chinese, English, and parallel bilingual text** while preserving experiment state.
- Rotate scenes with a mouse or touch; play, pause, step, and reset the camera.
- Expand equations and scientific limitations when ready; get immediate feedback from three quizzes.
- Responsive layout and support for reduced-motion preferences.
- Text, static illustrations, numerical readouts, and quizzes remain available without WebGL 2.
- No account, backend, or API key. Dependencies and equation fonts are bundled locally after building. Only the language preference is stored in the browser.

## Run locally

Requires Node.js **22.12+**. After cloning, run in the project directory:

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal. To validate and preview the production build:

```sh
npm test
npm run build
npm run preview -- --port 4173
```

Serve the app over HTTP rather than opening the source HTML directly. Append `?presentation=1` for classroom projection, and `&capture=1` for the recording layout. This repository provides source and a local demo; a hosted interactive demo is not currently available.

## Scientific scope

This is a conceptual teaching tool. Learning outcomes have not been evaluated with high-school students.

- Light cones show two spatial dimensions and a time axis in normalized units. The past cone does not imply time travel.
- Light clocks compare uniform motion in inertial frames. Acceleration, reunion, and the full twin problem are not simulated. Looping scene paths are illustrative; accumulated time readouts remain continuous.
- Mass means invariant mass. Rest energy is `E₀ = mc²`; total energy is `E = γmc²`.
- The depressed mesh is an arbitrarily specified 2D analogy, not the physical shape of four-dimensional spacetime. It does not solve Einstein's field equations.
- Light-deflection readouts use the spherical weak-field approximation `α ≈ 4GM/(bc²)`. Displayed angles are amplified **8,000 times**; the interpolated path is illustrative rather than a solved null geodesic.
- A no-WebGL fallback is implemented but has not been validated on an actual device without WebGL.

Explanations draw on [Einstein Online: light clocks](https://www.einstein-online.info/en/spotlight/light-clocks-time-dilation/), [spacetime](https://www.einstein-online.info/en/spacetime/), [light and the equivalence principle](https://www.einstein-online.info/en/spotlight/equivalence_light/), [NIST: testing mass–energy equivalence](https://www.nist.gov/news-events/news/2005/12/einstein-was-right-again-experiments-confirm-e-mc2), and [Stanford Gravity Probe B](https://einstein.stanford.edu/SPACETIME/spacetime3.html). These organizations do not endorse this project.

## Under the hood

**Three.js** renders procedural 3D scenes, **KaTeX** typesets equations, and **Vite** bundles the static app.

| File | Responsibility |
| --- | --- |
| `src/physics.js` | Calculations, constants, and weak-field approximation |
| `src/content.js` | Paired bilingual explanations, parameters, and sources |
| `src/scene.js` | Scenes, labels, and camera |
| `src/main.js` | Interaction state, language, readouts, and quizzes |
| `tests/physics.test.js` | Known values, scaling laws, and bilingual-content checks |
| `media/` | Concept cover, actual recordings, screenshots, and captions |

Physics is separated from rendering. Six scenes share one renderer and controller. [Validation notes (Chinese)](VALIDATION.md) · [Media provenance](media/PROVENANCE.md)

If this helped a concept click, consider starring the project. Questions from classroom use, translation suggestions, and model improvements are welcome in Issues.
