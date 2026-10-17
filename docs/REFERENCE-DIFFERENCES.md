# Reference and differences

The visual reference is [The Bugged Dev's Induction bench](https://x.com/thebuggeddev/status/2104402407358919124). Three supplied frames were inspected before implementation: a copper winding, an aluminium winding, and an angled coil with battery current. The reference media is not redistributed.

The cream instrument panels, dark 3D center, left control bank, analog meter and lower pair of graphs informed the composition. Original TypeScript, procedural geometry and locally bundled open-source fonts implement the result.

Differences are deliberate and documented:

- This implementation includes the coil experiment only; it does not claim to reproduce a tube-drop mode.
- The original physics model was unavailable. The independent analytic teaching model in `src/model.ts` does not promise matching numerical values.
- Field lines are illustrative geometry. Their color is relative, without a claim of calibrated field magnitude along the paths.
- Coil geometry is enlarged; visible loops represent groups of turns. This is not a dimensionally accurate engineering assembly.
- No free-body magnet dynamics, eddy currents, RL transients, saturation or temperature model is included.
- Accessible position control, keyboard shortcuts, CSV export, pause/reset, responsive layouts, reduced motion and a deterministic guided replay are included.
- The default is N52 / copper / 200 turns / air / 0 V, with a stationary magnet at +10.5 cm.

No claim of a pixel-perfect clone, original code reuse, authorization or endorsement is made.
