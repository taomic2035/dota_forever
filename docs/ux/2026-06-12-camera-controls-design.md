# Camera Controls UX Design

Date: 2026-06-12
Status: active continuation of UI and control focus

## Goal

Expose basic camera control preferences so players can tune map navigation without changing code.

## UX Problem

The camera already supports edge pan, arrow-key pan, wheel zoom, space-to-center, and middle-drag pan. However, edge pan and pan speed are currently hardcoded. Players who prefer precise cursor work may want edge pan off, while players who scan lanes quickly may want a faster camera.

## Scope

This batch covers:

- Persistent `edgePan` on/off setting.
- Persistent camera pan speed: `Slow`, `Normal`, or `Fast`.
- Pause menu controls for camera settings.
- URL overrides for deterministic QA.
- InputManager integration for edge pan and pan speed.

This batch does not add camera lock, control groups, minimap drag-scroll, or saved camera locations.

## Interaction Rules

- Edge pan defaults to on.
- Camera speed defaults to normal.
- Arrow-key pan and edge pan use the same configured speed.
- Middle-mouse drag and mouse-wheel zoom keep their existing behavior.
- Changing camera settings in the pause menu takes effect immediately.

## Acceptance Criteria

- Pure setting tests prove camera speed parsing, cycling, labels, and multipliers.
- `InputManager` uses normalized control settings for edge pan and pan speed.
- Pause menu exposes visible camera speed and edge pan controls.
- URL params can force `cameraSpeed` and `edgePan`.
- Screenshot validation proves the pause menu reflects camera settings.
- Focused tests, full tests, and build pass.
