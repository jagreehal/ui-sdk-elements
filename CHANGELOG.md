# ui-sdk-elements

## 0.1.0

### Minor Changes

- 515bb2c: First release. Branded web components on ui-sdk: one set of `--ds-*` tokens themes every component, a CDN loader fetches only the tags on a page, and `elementsCdn()` from `ui-sdk-elements/vite` builds the same kind of CDN for your own components (stock ui-sdk tags and your own, under any prefix). Also ships `createLoader`, the composed `ui-step-grid`, and a json-render catalog with `specToPage` and `renderSpec` for generated pages.

### Patch Changes

- e8c8d2d: `ui-step-grid` lists its tracks in an agent's snapshot, each with its steps in the format `setTrack` takes (`Kick: x...x...x...x...`), so an agent can read a pattern and write one without guessing track names.
