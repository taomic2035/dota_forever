# Resource3D Handoff for Opus

Date: 2026-06-13
Branch/worktree: `main` at `~/vibecoding/dota_forever`
Primary preview routes: `?mode=resource3d-preview`, `?mode=hero3d-preview`, `?mode=play&renderer=3d`
Legacy phase-1 screenshot: `docs/screenshots/ux-resource3d-preview.png`

Current V26 update for Opus merge:

- Worktree/branch: `main` at `~/vibecoding/dota_forever`.
- Current coordination note: Codex owns UX/material/control polish; Opus owns mainline gameplay integration. Short cross-cat handoff: `docs/ux/2026-06-19-codex-opus-ux-handoff.md`. New cross-over point is `docs/ux/2026-06-19-toggle-autocast-badges-summary.md`: tagged autocast orb effects now obey `AbilityInstance.autocastOn` in `src/sim/abilities.ts`, and learned passive autocast/toggle abilities can be switched from QWER or right-click ability slots. Default-state policy, one-orb priority, manual orb-cast orders, and deeper cost semantics remain open for Opus.
- HUD tooltip note: `src/ui/abilityTooltipModel.ts` and `src/ui/itemTooltipModel.ts` now own slot hover title text for current cooldown/mana/ready/toggle/charge/backpack-no-bonus states; if Opus changes ability or item availability semantics, update those models and tests alongside sim changes.
- UX/control handoff addendum: `docs/ux/2026-06-19-minimap-target-confirm-summary.md`.
- Related 2026-06-19 UX control summaries: `docs/ux/2026-06-19-minimap-misclick-guard-summary.md`,
  `docs/ux/2026-06-19-world-alt-ping-summary.md`, `docs/ux/2026-06-19-f1-doubletap-center-summary.md`,
  `docs/ux/2026-06-19-game-speed-hud-summary.md`, `docs/ux/2026-06-19-building-attack-alert-toast-summary.md`,
  `docs/ux/2026-06-19-death-recap-assists-summary.md`, `docs/ux/2026-06-19-alt-click-status-broadcast-summary.md`,
  `docs/ux/2026-06-19-deny-rules-fidelity-summary.md`, `docs/ux/2026-06-19-break-status-chip-summary.md`,
  `docs/ux/2026-06-19-inspect-cast-progress-summary.md`, `docs/ux/2026-06-19-accessibility-mode-summary.md`,
  `docs/ux/2026-06-19-selected-cast-subject-summary.md`, `docs/ux/2026-06-19-manual-courier-delivery-summary.md`,
  `docs/ux/2026-06-19-auto-attack-mode-summary.md`,
  `docs/ux/2026-06-19-toggle-autocast-badges-summary.md`,
  `docs/ux/2026-06-19-control-presets-summary.md`,
  `docs/ux/2026-06-19-keybind-capture-summary.md`,
  `docs/ux/2026-06-19-onboarding-gates-summary.md`,
  `docs/ux/2026-06-19-side-shop-summary.md`.
- V26 non-hero real-play model quality summary: `docs/ux/2026-06-19-3d-v26-nonhero-model-quality-summary.md`.
- V3 summary: `docs/ux/2026-06-13-3d-v3-resource-polish-summary.md`.
- V3 screenshot: `docs/screenshots/ux-3d-v3-resource-material-motion.png`.
- V3 part-motion screenshot: `docs/screenshots/ux-3d-v3-resource-part-motion.png`.
- V3 FX screenshot: `docs/screenshots/ux-3d-v3-fx-polish.png`.
- Shift queue controls screenshot: `docs/screenshots/ux-shift-queue-controls.png`.
- V4 map terrain research target: `docs/ux/2026-06-13-dota-map-elements-research-target.md`.
- V4 map terrain summary: `docs/ux/2026-06-13-3d-v4-map-terrain-realism-summary.md`.
- Next unit/FX research target: `docs/ux/2026-06-13-dota-unit-fx-research-target.md`.
- V4 map terrain screenshot: `docs/screenshots/ux-3d-v4-map-terrain-realism.png`.
- V4 tree-wall close-up screenshot: `docs/screenshots/ux-3d-v4-map-treewall-closeup.png`.
- V4 tree-wall biome screenshots: `docs/screenshots/ux-3d-v4-map-treewall-biome-radiant.png`, `docs/screenshots/ux-3d-v4-map-treewall-biome-dire.png`.
- V4 riverbank polish screenshot: `docs/screenshots/ux-3d-v4-map-river-bank-polish.png`.
- V4 ground decal polish screenshot: `docs/screenshots/ux-3d-v4-map-ground-decals-polish.png`.
- V4 sky/fog polish screenshot: `docs/screenshots/ux-3d-v4-map-sky-fog-polish.png`.
- V4 fence/blocker polish screenshot: `docs/screenshots/ux-3d-v4-map-fence-blocker-polish.png`.
- V4 highground/ramp screenshot: `docs/screenshots/ux-3d-v4-map-highground-ramp.png`.
- V4 rocky cliff-face screenshot: `docs/screenshots/ux-3d-v4-map-cliff-face-rocky.png`.
- V4 cliff biome polish screenshots: `docs/screenshots/ux-3d-v4-map-cliff-biome-polish.png`, `docs/screenshots/ux-3d-v4-map-cliff-biome-dire-polish.png`.
- V4 river runtime motion screenshot: `docs/screenshots/ux-3d-v4-map-river-motion-polish.png`.
- V5 hero readability summary: `docs/ux/2026-06-14-3d-v5-hero-readability-summary.md`.
- V5 hero readability screenshot: `docs/screenshots/ux-3d-v5-hero-readability.png`.
- V5 lane-unit readability summary: `docs/ux/2026-06-14-3d-v5-lane-unit-readability-summary.md`.
- V5 lane-unit readability screenshot: `docs/screenshots/ux-3d-v5-lane-unit-readability.png`.
- V5 neutral/boss readability summary: `docs/ux/2026-06-14-3d-v5-neutral-boss-readability-summary.md`.
- V5 neutral/boss readability screenshot: `docs/screenshots/ux-3d-v5-neutral-boss-readability.png`.
- V5 summon/ward readability summary: `docs/ux/2026-06-14-3d-v5-summon-ward-readability-summary.md`.
- V5 summon/ward readability screenshot: `docs/screenshots/ux-3d-v5-summon-ward-readability.png`.
- V5 skill-FX phase summary: `docs/ux/2026-06-14-3d-v5-skill-fx-phase-summary.md`.
- V5 skill-FX phase screenshot: `docs/screenshots/ux-3d-v5-skill-fx-phase.png`.
- V6 surface realism summary: `docs/ux/2026-06-14-3d-v6-surface-realism-summary.md`.
- V6 hero surface realism screenshot: `docs/screenshots/ux-3d-v6-hero-surface-realism.png`.
- V6 resource surface realism screenshot: `docs/screenshots/ux-3d-v6-resource-surface-realism.png`.
- V7 resource integration contract summary: `docs/ux/2026-06-14-3d-v7-resource-integration-contract-summary.md`.
- V7 resource integration screenshot: `docs/screenshots/ux-3d-v7-resource-integration-contract.png`.
- V8 resource runtime consumption summary: `docs/ux/2026-06-14-3d-v8-resource-runtime-consumption-summary.md`.
- V8 resource runtime consumption screenshot: `docs/screenshots/ux-3d-v8-resource-runtime-consumption.png`.
- V9 VFX/audio sync contract summary: `docs/ux/2026-06-14-3d-v9-vfx-audio-sync-summary.md`.
- V9 VFX/audio sync contract screenshot: `docs/screenshots/ux-3d-v9-vfx-audio-contract.png`.
- V10 VFX playback layers summary: `docs/ux/2026-06-14-3d-v10-vfx-playback-layers-summary.md`.
- V10 VFX playback layers screenshot: `docs/screenshots/ux-3d-v10-vfx-playback-layers.png`.
- V11 VFX phase animation summary: `docs/ux/2026-06-14-3d-v11-vfx-phase-animation-summary.md`.
- V11 VFX phase animation screenshot: `docs/screenshots/ux-3d-v11-vfx-phase-animation.png`.
- V12 runtime motion summary: `docs/ux/2026-06-14-3d-v12-runtime-motion-summary.md`.
- V12 runtime motion screenshot: `docs/screenshots/ux-3d-v12-runtime-motion.png`.
- V13 runtime surface summary: `docs/ux/2026-06-14-3d-v13-runtime-surface-summary.md`.
- V13 runtime surface screenshot: `docs/screenshots/ux-3d-v13-runtime-surface.png`.
- V14 hero runtime presentation summary: `docs/ux/2026-06-14-3d-v14-hero-runtime-presentation-summary.md`.
- V14 hero runtime presentation screenshot: `docs/screenshots/ux-3d-v14-hero-runtime-presentation.png`.
- V15 unit runtime presentation summary: `docs/ux/2026-06-14-3d-v15-unit-runtime-presentation-summary.md`.
- V15 unit runtime presentation screenshot: `docs/screenshots/ux-3d-v15-unit-runtime-presentation.png`.
- V16 map runtime ambience summary: `docs/ux/2026-06-14-3d-v16-map-runtime-ambience-summary.md`.
- V16 map runtime ambience screenshot: `docs/screenshots/ux-3d-v16-map-runtime-ambience.png`.
- V17 combat FX readability summary: `docs/ux/2026-06-14-3d-v17-combat-fx-readability-summary.md`.
- V17 combat FX readability screenshot: `docs/screenshots/ux-3d-v17-combat-fx-readability.png`.
- V21 real-play resource runtime bridge summary: `docs/ux/2026-06-14-3d-v21-resource-runtime-bridge-summary.md`.
- V21 real-play resource runtime bridge screenshot: `docs/screenshots/ux-3d-v21-resource-runtime-bridge.png`.
- V26 note: real `buildUnitModel(...)` output now carries play-camera model-quality metadata for lane creeps, neutrals, and illusions; the main humanoid path uses rounded/capsule/sphere/cylinder geometry instead of box-heavy placeholder reads.
- Adds material/detail metadata, high-detail procedural texture overlays, runtime hero action/surface presentation, runtime non-hero unit presentation, runtime map/terrain ambience presentation, combat FX readability presentation, runtime resource motion, part-level model motion, richer 3D battle FX, V4 map terrain realism layers, V9 VFX/audio sync contracts, V10 visible VFX playback layers, V11 VFX phase animation, V12 all-resource runtime motion, V13 runtime material/surface animation, and shift-queued command UX.
- V21 note: non-hero resource units now consume `updateResourceRuntimeUnitPresentation(...)` in the real `?mode=play&renderer=3d` path through `src/render3d/resource3dModel.ts`, not only in `?mode=resource3d-preview`.
- Scope note: this branch now includes UI/control plumbing for queued orders in `src/sim/unit.ts`, `src/engine/input.ts`, and related tests. Those changes are intentional UX/control-side work for Opus to review against mainline logic.

Terrain screenshots:

- `docs/screenshots/ux-resource3d-terrain-preview.png`
- `docs/screenshots/ux-resource3d-map-props-preview.png`
- `docs/screenshots/ux-resource3d-environment-preview.png`
Feedback screenshot:

- `docs/screenshots/ux-resource3d-feedback-preview.png`
Match-shell screenshot:

- `docs/screenshots/ux-resource3d-match-ui-preview.png`

## What

This branch adds first-pass Three.js samples for non-hero game resources.

Covered resource categories:

- `lane_units`: 10 samples
- `neutral_units`: 10 samples
- `boss_objectives`: 10 samples
- `buildings`: 10 samples
- `shops_npcs`: 10 samples
- `couriers_summons`: 10 samples
- `items`: 10 samples
- `item_components`: 10 samples
- `consumables`: 10 samples
- `wards_traps`: 10 samples
- `spell_fx`: 10 samples
- `projectiles`: 10 samples
- `aoe_indicators`: 10 samples
- `environment_fx`: 15 samples
- `map_props`: 21 samples
- `runes_powerups`: 10 samples
- `pickups_drops`: 10 samples
- `status_effects`: 10 samples
- `ability_icons`: 10 samples
- `targeting_reticles`: 10 samples
- `combat_numbers`: 10 samples
- `health_mana_ui`: 10 samples
- `screen_overlays`: 10 samples
- `announcements`: 10 samples
- `shop_inventory_ui`: 10 samples
- `sound_cue_markers`: 10 samples
- `hero_roster_ui`: 10 samples
- `level_talent_ui`: 10 samples
- `death_recap_ui`: 10 samples
- `scoreboard_ui`: 10 samples
- `match_flow_ui`: 10 samples
- `cursor_commands`: 10 samples
- `system_notifications`: 10 samples
- `tutorial_guides`: 10 samples
- `ui_badges`: 10 samples
- `terrain_tiles`: 22 samples
- `minimap_markers`: 10 samples
- `team_banners`: 10 samples

Total: 408 samples.

## Completion Checklist

### Completed

- [x] Hero3D first batch exists as an in-project Three.js preview.
  - 10 classic heroes are defined in `src/render/hero3dAssets.ts`.
  - Each hero has procedural model parts, generated texture channels, action clip metadata, silhouette metadata, and preview camera metadata.
  - Preview route: `?mode=hero3d-preview`.
  - Evidence: `docs/screenshots/ux-hero3d-preview.png`.
- [x] V5 hero readability polish exists for the first 10 classic heroes.
  - Each hero has a unique `readability.primaryRead`, named silhouette anchors, stance/weapon/spell-focus pose metadata, and bounded `fxPriority`.
  - Each hero receives visible V5 model anchors: crest read, weapon line read, rear profile read, and cast focus read.
  - Hero preview exposes `window.__hero3dPreview.readability` for Opus smoke checks.
  - Evidence: `docs/screenshots/ux-3d-v5-hero-readability.png`.
- [x] Resource3D taxonomy is broad enough for a first integration pass.
  - 38 non-hero resource categories are defined in `RESOURCE3D_CATEGORIES`.
  - 408 total resource samples are defined in `RESOURCE3D_SAMPLE_ASSETS`.
  - Every category has at least 10 samples; terrain-heavy categories have more:
    - `environment_fx`: 15
    - `map_props`: 21
    - `terrain_tiles`: 22
- [x] Core world/resource categories are covered.
  - Lane units, neutral units, Boss/objectives, buildings, shops/NPCs, couriers/summons.
  - Items, item components, consumables, wards/traps.
  - Runes/power-ups, pickups/drops, team banners, minimap markers.
- [x] V5 lane-unit readability polish exists for the first 10 lane samples.
  - Lane units now expose `laneReadability.teamRead`, `roleClass`, `formationSlot`, `attackRead`, and `silhouetteAnchors`.
  - Covered role classes: melee, ranged, siege, super, utility, scout.
  - Covered team reads: dawn, night, neutral.
  - Each lane unit receives visible V5 model anchors: formation banner, role attack read, team trim plate, and formation foot rune.
  - Resource preview exposes `window.__resource3dPreview.laneReadability` for Opus smoke checks.
  - Evidence: `docs/screenshots/ux-3d-v5-lane-unit-readability.png`.
- [x] V5 neutral / boss readability polish exists for 20 wild/objective samples.
  - Neutral and boss/objective resources now expose `wildReadability.tier`, `biome`, `packRole`, `threatRead`, and `silhouetteAnchors`.
  - Covered neutral tiers: small, medium, large, ancient, special.
  - Covered objective tiers: boss, objective.
  - Covered pack roles: fodder, leader, caster, flying, ancient, boss-core, objective-mechanic.
  - Resource preview exposes `window.__resource3dPreview.wildReadability` for Opus smoke checks.
  - Evidence: `docs/screenshots/ux-3d-v5-neutral-boss-readability.png`.
- [x] V5 summon / ward readability polish exists for 20 support-object samples.
  - Couriers, summons, illusions, wards, traps, and totems now expose `supportReadability`.
  - Support objects define owner read, interaction read, expiration cue, priority band, and bounded visual priority.
  - Max support-object visual priority is `0.56`, keeping them below hero-priority visuals.
  - Resource preview exposes `window.__resource3dPreview.supportReadability` for Opus smoke checks.
  - Evidence: `docs/screenshots/ux-3d-v5-summon-ward-readability.png`.
- [x] V5 skill / battle-FX phase polish exists.
  - `Fx3DVisualState.phaseContract` defines `windup`, `impact`, `linger`, and `fade`.
  - Danger-shape mapping is stable: burst=`point`, beam=`line`, aoe=`radius`, projectile=`path`.
  - Runtime `Fx3D` consumes phase opacity/scale timing without touching sim rules.
  - Runtime inspection names are stable: `fx3d:<geometry>:<family>:<pattern>` and `fx3d-layer:<role>:<shape>`.
  - Evidence: `docs/screenshots/ux-3d-v5-skill-fx-phase.png`.
- [x] V6 cross-asset surface realism exists.
  - Hero and resource material profiles now include `normalIntensity`, `rimLightIntensity`, `contactShadowOpacity`, and `wearIntensity`.
  - Heroes and all 408 resource samples get named contact-shadow meshes.
  - Rim-heavy materials get named `v6-surface-glint:*` overlays.
  - Hero preview exposes `window.__hero3dPreview.surfaceRealism`.
  - Resource preview exposes `window.__resource3dPreview.surfaceRealism`.
  - Evidence: `docs/screenshots/ux-3d-v6-hero-surface-realism.png` and `docs/screenshots/ux-3d-v6-resource-surface-realism.png`.
- [x] V7 resource placement / collision / LOD / production-path contract exists.
  - All 408 resource samples now expose `placement`, `lod`, and `production` metadata.
  - `placement` covers `walkable`, `blocker`, `heightLevel`, `river`, `visionBlocker`, `placementLayer`, `footprintRadius`, `selectable`, and `teamScoped`.
  - `lod` covers `near`, `mid`, `far`, `impostorAfter`, and shadow downgrade mode.
  - `production` points to replacement-ready `public/assets/tree3d/resources/<category>/<assetKey>/model.glb` and per-channel PBR texture paths.
  - Resource preview exposes `window.__resource3dPreview.integration`.
  - Evidence: `docs/screenshots/ux-3d-v7-resource-integration-contract.png`.
- [x] V8 resource runtime consumption exists inside generated Three.js resource roots.
  - `createResource3DModel(asset)` now writes `placement`, `lod`, `production`, and `runtimeIntegration` onto `root.userData`.
  - World resources get named footprint rings: `resource3d:v8-footprint:<assetKey>`.
  - All resources get named LOD / production anchors: `resource3d:v8-lod-anchor:<assetKey>`.
  - Resource preview exposes current-category runtime smoke data through `window.__resource3dPreview.activeRuntime`.
  - Evidence: `docs/screenshots/ux-3d-v8-resource-runtime-consumption.png`.
- [x] V9 VFX/audio sync contracts exist for combat, environment, and audio-cue resources.
  - `spell_fx`, `projectiles`, `aoe_indicators`, `environment_fx`, and `sound_cue_markers` now expose `vfxAudio` metadata.
  - Contracts cover visual family, danger shape, particle layer specs, `.ogg` cue path conventions, phase sync, light hints, and decal hints.
  - `createResource3DModel(asset)` now writes `root.userData.vfxAudio` and `root.userData.runtimeVfxAudio`.
  - VFX/audio resources get named sync anchors: `resource3d:v9-vfx-audio-sync:<assetKey>`.
  - Resource preview exposes `window.__resource3dPreview.vfxAudio` and current-category VFX/audio runtime smoke data.
  - Evidence: `docs/screenshots/ux-3d-v9-vfx-audio-contract.png`.
- [x] V10 visible VFX playback layers exist for VFX/audio resource contracts.
  - VFX/audio resources now get named playback roots: `resource3d:v10-vfx-playback:<assetKey>`.
  - V9 particle layers now get visible representative layer meshes: `resource3d:v10-vfx-layer:<assetKey>:<role>`.
  - VFX playback roots include visible light hints and non-`none` ground-residue decals.
  - `createResource3DModel(asset)` now writes `root.userData.runtimeVfxPlayback`.
  - Resource preview exposes current-category V10 playback smoke data through `window.__resource3dPreview.activeRuntime`.
  - Evidence: `docs/screenshots/ux-3d-v10-vfx-playback-layers.png`.
- [x] V11 runtime VFX phase animation exists for V10 playback layers.
  - `updateResourceVfxPlayback(root, elapsedMs)` drives windup / impact / linger / fade state from `phaseTimelineMs`.
  - VFX layer meshes animate opacity and scale by phase role.
  - Light hints pulse by active phase and configured pulse rate.
  - Ground-residue decals rise/fade through impact, linger, and cleanup.
  - Resource preview calls the V11 helper every frame and exposes animated smoke counts.
  - Evidence: `docs/screenshots/ux-3d-v11-vfx-phase-animation.png`.
- [x] V12 all-resource runtime motion exists for Resource3D samples.
  - All 408 Resource3D samples expose `root.userData.runtimeMotion`.
  - `updateResourceRuntimeMotion(root, elapsedMs)` drives deterministic idle / pulse / spin / float / impact / ambient motion from base transforms.
  - Resource parts now carry `basePosition`, `baseRotation`, `baseScale`, `runtimeMotionWeight`, and `runtimeMotionSurfaceReactive`.
  - Resource preview calls the V12 helper every frame and exposes current-category runtime motion smoke counts.
  - Evidence: `docs/screenshots/ux-3d-v12-runtime-motion.png`.
- [x] V13 runtime surface-material animation exists for Resource3D samples.
  - All 408 Resource3D samples expose `root.userData.runtimeSurface`.
  - `updateResourceRuntimeSurface(root, elapsedMs)` drives deterministic emissive / roughness / opacity / rim / normal pulses from cached base material values.
  - Runtime shader intents split resources into `energy-fresnel-pulse`, `metal-rim-sweep`, `cloth-dye-breathe`, `water-caustic-flow`, `foliage-leaf-sheen`, `stone-wear-shadow`, and `shadow-ink-bloom`.
  - Resource preview calls the V13 helper every frame and exposes current-category runtime surface smoke counts.
  - Evidence: `docs/screenshots/ux-3d-v13-runtime-surface.png`.
- [x] V14 hero runtime action/surface presentation exists for the first 10 classic heroes.
  - All 10 Hero3D roots expose `root.userData.runtimeAction` and `root.userData.runtimeSurface`.
  - `updateHeroRuntimePresentation(root, actionName, elapsedMs)` drives deterministic posture, action pulse, status jitter, opacity, emissive, roughness, rim, and normal changes from cached base values.
  - Runtime action states split hero actions into `idle`, `locomotion`, `attack`, `cast`, `channel`, `status`, `hit`, and `death`.
  - Runtime shader intents split heroes into `hero-armor-rim-sweep`, `hero-arcane-fresnel`, `hero-cloth-breathe`, `hero-shadow-veil`, and `hero-stone-weight`.
  - Hero preview calls the V14 helper every frame and exposes `window.__hero3dPreview.runtimePresentation`.
  - Evidence: `docs/screenshots/ux-3d-v14-hero-runtime-presentation.png`.
- [x] V15 non-hero unit runtime presentation exists for 50 unit-like Resource3D samples.
  - Lane units, neutral units, boss/objectives, couriers/summons, and wards/traps expose `root.userData.runtimeUnitPresentation`.
  - `updateResourceRuntimeUnitPresentation(root, actionState, elapsedMs)` drives deterministic action posture, threat pulse, support expiration fade, action-cue opacity/scale, and material response from cached base values.
  - Unit runtime states split presentation into `idle`, `move`, `attack`, `cast`, `hit`, `death`, and `expire`.
  - Unit runtime classes split assets into lane, wild, boss/objective, and support families.
  - Resource preview calls the V15 helper every frame and exposes global and current-category runtime unit smoke counts.
  - Evidence: `docs/screenshots/ux-3d-v15-unit-runtime-presentation.png`.
- [x] V21 real-play resource runtime bridge exists for mapped non-hero units.
  - `src/render3d/resource3dModel.ts` now calls `updateResourceRuntimeUnitPresentation(...)` from the real `UnitModel.applyPose(...)` path.
  - Gameplay pose states map to resource runtime states: walk -> move, attack -> attack, cast/channel -> cast, death -> death, hit status -> hit.
  - Resource roots expose `root.userData.gameplayRuntimeBridge` for Opus inspection.
  - Runtime base scale is normalized to `[1, 1, 1]` under the gameplay scaler, preventing preview asset scale from double-applying in real play.
  - Real play-route evidence confirms `resource3d:dawn_melee_creep` animates runtime unit parts/materials/cues during an attack pose.
  - Evidence: `docs/screenshots/ux-3d-v21-resource-runtime-bridge.png`.
- [x] V26 non-hero real-play model-quality pass exists for generic unit models.
  - `src/render3d/modelGen.ts` uses rounded/capsule, sphere, and cylinder reads for humanoid bodies, heads, limbs, hands, feet, and clone glints.
  - `src/render3d/unitModel.ts` uses ellipsoid core volumes for neutral/beast bodies, humps, heads, and snouts.
  - Unit roots expose `root.userData.gameplayUnitModelQuality` for Opus smoke checks.
  - Key parts expose `obj.userData.playCameraReadabilityLayer`.
  - Covered smoke cases: lane creep, ancient neutral, illusion.
  - Evidence summary: `docs/ux/2026-06-19-3d-v26-nonhero-model-quality-summary.md`.
- [x] V16 map runtime ambience exists for 58 terrain/map/environment Resource3D samples.
  - `terrain_tiles`, `map_props`, and `environment_fx` expose `root.userData.runtimeMapPresentation`.
  - `updateResourceRuntimeMapPresentation(root, elapsedMs)` drives deterministic river flow, sky haze, tree-wall occlusion, highground depth, grass/flower bloom, fence depth, and ground-dust ambience from cached base values.
  - Runtime map classes split assets into `river-corridor`, `sky-atmosphere`, `tree-wall`, `highground-edge`, `grass-flower`, `fence-blocker`, `flat-ground`, `ambient-fx`, and map-prop families.
  - Resource preview calls the V16 helper every frame and exposes global and current-category runtime map smoke counts.
  - Evidence: `docs/screenshots/ux-3d-v16-map-runtime-ambience.png`.
- [x] V17 combat FX readability exists for 50 spell/projectile/AoE/status/reticle Resource3D samples.
  - `spell_fx`, `projectiles`, `aoe_indicators`, `status_effects`, and `targeting_reticles` expose `root.userData.runtimeFxReadability`.
  - `updateResourceRuntimeFxReadability(root, elapsedMs)` drives deterministic projectile path pulse, AoE radius pulse, status aura pulse, target confirmation pulse, invalid-target emphasis, and material response from cached base values.
  - Runtime FX classes split assets into `spell-burst`, `projectile-path`, `area-telegraph`, `status-aura`, and `targeting-reticle`.
  - Resource preview calls the V17 helper every frame and exposes global and current-category runtime FX readability smoke counts.
  - Evidence: `docs/screenshots/ux-3d-v17-combat-fx-readability.png`.
- [x] Combat readability and VFX categories are covered.
  - Spell FX, projectiles, AoE indicators, status effects, targeting reticles.
  - Combat numbers, health/mana UI, screen overlays, announcements.
- [x] Terrain/art dressing categories are explicitly covered.
  - Flat ground, trees, grass, flowers, high ground, fences, slopes/ramps, river/riverbanks, sky domes, cloud shadows, sky lighting.
  - Evidence screenshots:
    - `docs/screenshots/ux-resource3d-terrain-preview.png`
    - `docs/screenshots/ux-resource3d-map-props-preview.png`
    - `docs/screenshots/ux-resource3d-environment-preview.png`
- [x] Match-shell and UI support categories are covered.
  - Ability icons, shop/inventory UI, sound cue markers, hero roster, level/talent UI, death recap, scoreboard, match flow, cursor commands, system notifications, tutorial guides.
  - Evidence screenshots:
    - `docs/screenshots/ux-resource3d-feedback-preview.png`
    - `docs/screenshots/ux-resource3d-match-ui-preview.png`
- [x] Preview and validation plumbing exists.
  - Preview route: `?mode=resource3d-preview`.
  - `window.__resource3dPreview` exposes category/count smoke data.
  - `tests/resource3dAssets.test.ts` locks taxonomy, minimum sample count, renderability, visual variety, unique keys, and requested terrain subtypes.
  - `tests/hero3dAssets.test.ts` locks hero keys, texture/action contract, silhouettes, and detail thresholds.
- [x] Shift-queue command UX exists for controls integration.
  - Shift + right click, attack move, abilities, and item commands can append to the selected unit order queue.
  - 2D and 3D renderers can draw the selected unit queued route with numbered waypoints.
  - Evidence: `docs/screenshots/ux-shift-queue-controls.png` and `docs/screenshots/ux-3d-shift-queue-route.png`.
- [x] V3 resource runtime polish exists.
  - Resource3D parts include material/detail/texture metadata.
  - Runtime unit resources apply whole-model motion and part-level local motion.
  - Evidence: `docs/screenshots/ux-3d-v3-resource-material-motion.png` and `docs/screenshots/ux-3d-v3-resource-part-motion.png`.
- [x] V3 3D battle FX polish exists.
  - `src/render3d/fx3dVisual.ts` maps `fxStyle` family/pattern metadata into 3D FX layers.
  - `src/render3d/fx3d.ts` renders burst / beam / AoE / projectile as multi-layer Three.js groups.
  - Evidence: `docs/screenshots/ux-3d-v3-fx-polish.png`.
- [x] V4 map terrain realism research target and first runtime pass exist.
  - Research target: `docs/ux/2026-06-13-dota-map-elements-research-target.md`.
  - Runtime layers cover sky, cloud shadows, horizon haze, sun shafts, river current, wet riverbanks, foam/glints, worn dirt paths, grass mottle, stone slabs, tree wall trunks/canopies, Radiant/Dire tree biome accents, grass, flowers, reeds, river stones, layered cliff faces, Radiant/Dire cliff tint, rubble/cracks, layered cliff fences/blockers, highground edges, ramp stairs, and landmark rings.
  - Riverbank polish adds `terrain-river-bank-mud` and `terrain-river-foam-glints` on top of existing `terrain-river-current`, `terrain-river-reeds`, and `terrain-river-stones`.
  - River runtime motion adds visual-only contracts: `terrain-river-current.motion = flow`, `terrain-river-foam-glints.motion = foam-pulse`, and `terrain-river-reeds.motion = reed-sway`.
  - Ground polish groups `terrain-ground-decals` with child layers `terrain-ground-dirt-paths`, `terrain-ground-grass-mottle`, and `terrain-ground-stone-slabs`.
  - Sky/fog polish groups `terrain-atmosphere` with child layers `terrain-horizon-haze` and `terrain-sun-shafts`.
  - Tree biome accents are grouped as `terrain-tree-biome-accents` with child layers `terrain-tree-radiant-light-canopy`, `terrain-tree-radiant-blooms`, `terrain-tree-dire-dark-canopy`, and `terrain-tree-dire-dead-branches`.
  - Layered cliff faces are grouped as `terrain-cliff-faces` with child layers `terrain-cliff-face-walls`, `terrain-cliff-rock-caps`, and `terrain-cliff-ledge-shadows`.
  - Cliff biome details are grouped as `terrain-cliff-biome-details` with child layers `terrain-cliff-radiant-moss`, `terrain-cliff-dire-scorch`, `terrain-cliff-rubble`, and `terrain-cliff-cracks`.
  - Layered cliff fences are grouped as `terrain-cliff-fences` with child layers `terrain-cliff-fence-rails`, `terrain-cliff-fence-posts`, and `terrain-cliff-fence-stone-bases`.
  - Evidence: `docs/screenshots/ux-3d-v4-map-terrain-realism.png`, `docs/screenshots/ux-3d-v4-map-treewall-closeup.png`, `docs/screenshots/ux-3d-v4-map-treewall-biome-radiant.png`, `docs/screenshots/ux-3d-v4-map-treewall-biome-dire.png`, `docs/screenshots/ux-3d-v4-map-river-bank-polish.png`, `docs/screenshots/ux-3d-v4-map-river-motion-polish.png`, `docs/screenshots/ux-3d-v4-map-ground-decals-polish.png`, `docs/screenshots/ux-3d-v4-map-sky-fog-polish.png`, `docs/screenshots/ux-3d-v4-map-fence-blocker-polish.png`, `docs/screenshots/ux-3d-v4-map-highground-ramp.png`, `docs/screenshots/ux-3d-v4-map-cliff-face-rocky.png`, `docs/screenshots/ux-3d-v4-map-cliff-biome-polish.png`, `docs/screenshots/ux-3d-v4-map-cliff-biome-dire-polish.png`.
- [x] Next-phase hero/creep/summon/neutral/skill/FX research target exists.
  - Research target: `docs/ux/2026-06-13-dota-unit-fx-research-target.md`.
  - Scope is visual/UX asset polish only; no copied Dota assets and no gameplay-rule changes.

### Not Completed

- [ ] Production art assets are not done.
  - Current assets are procedural Three.js samples for art direction and integration contracts.
  - Final GLB/FBX models, hand-authored PBR textures, authored particles, rigging, and final animation clips still need a production pipeline.
- [ ] Full `tree3d.js` production-asset pipeline is not done.
  - This branch provides in-project Three.js procedural assets and runtime visual contracts.
  - Final external model import, skeleton retargeting, PBR texture file loading, authored animation clips, LOD, and asset bundle packaging still need a formal production pipeline.
- [ ] Authoritative map/pathing consumption of placement/collision/LOD metadata is not wired.
  - V8 makes generated resource roots consume and expose the metadata, but the map renderer/pathing layer does not yet use it as authoritative collision.
  - Runtime LOD anchors exist, but distance-based LOD switching is not implemented yet.
- [ ] Final authored VFX/audio assets and playback runtime are not done.
  - V9 now defines and consumes `vfxAudio` contracts for `spell_fx`, `projectiles`, `aoe_indicators`, `environment_fx`, and `sound_cue_markers`.
  - V10 now makes those contracts visible through generated playback roots, layer meshes, light hints, and ground-residue decals.
  - V11 now animates those visible playback layers through phase timing.
  - No real `.wav`/`.ogg` sound files are included.
  - No GPU particles, authored atlas textures, sprite flipbooks, final particle sequences, real dynamic light-volume playback, decal projection, or audio mixer sync are implemented yet.
  - V9 sync anchors, V10 playback layers, and V11 phase animation are inspection hooks for Opus and the future `tree3d.js` production loader, not final authored playback.
- [ ] UI categories are sample style guides, not final UI implementation.
  - Ability icons, combat numbers, screen overlays, announcements, roster, scoreboard, death recap, and tutorial guides are sample 3D/style assets.
  - They are not yet wired into HUD/state screens.
- [ ] Per-hero and per-item depth is not complete.
  - The first 10 heroes now have V5 first-read contracts and visible identity anchors, but not every hero in the eventual roster.
  - The first 10 heroes still need authored GLB/PBR models, authored rigs, and per-hero final animation clips before production-art completion.
  - V12 gives items/components/abilities deterministic procedural runtime motion, but they are still representative samples, not one final authored asset per final gameplay entry.
- [ ] Code splitting is not done.
  - Three.js is still statically imported through preview paths, so Vite reports a large chunk warning.
  - Recommended before production merge: lazy-load `hero3dPreview.ts` and `resource3dPreview.ts` behind query routes.
- [x] Full-suite timing has fresh merge evidence.
  - `npm test -- --pool=forks --maxWorkers=1` passed in this worktree after the V13 runtime surface-material pass.
  - 105 test files passed, 907 tests passed.
  - Note: an earlier parallel fork run from a previous pass reported all files passed, then exited non-zero from Vitest worker RPC shutdown (`Timeout calling "onTaskUpdate"`). Use `--maxWorkers=1` if Opus sees the same Vitest worker shutdown issue during merge validation.
- [x] V5 resource/terrain/FX focused suite has fresh evidence.
  - `npm test -- tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts`
  - 8 test files passed, 46 tests passed.
- [x] V6 surface realism focused suite has fresh evidence.
  - `npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts`
  - 10 test files passed, 51 tests passed.
- [x] V7 resource integration contract has fresh evidence.
  - `npm test -- tests/resource3dAssets.test.ts`
  - 1 test file passed, 11 tests passed.
  - `npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts`
  - 10 test files passed, 53 tests passed.
  - Playwright smoke at `http://127.0.0.1:5205/?mode=resource3d-preview`: `productionReady=408`, `lodReady=408`, `placementLayers={unit:40, building:20, prop:81, fx:85, projectile:10, ui:130, marker:20, terrain:22}`.
- [x] V8 resource runtime consumption has fresh evidence.
  - `npm test -- tests/resource3dFactory.test.ts`
  - 1 test file passed, 6 tests passed.
  - `npm test -- tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts`
  - 2 test files passed, 17 tests passed.
  - `npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts`
  - 10 test files passed, 55 tests passed.
  - Playwright smoke at `http://127.0.0.1:5206/?mode=resource3d-preview`: `activeRuntime={category:terrain_tiles, resourceCount:22, runtimeRoots:22, footprints:22, lodAnchors:22, rivers:3}`.
- [x] V9 VFX/audio sync contract has fresh evidence.
  - `npm test -- tests/resource3dPreview.test.ts`
  - 1 test file passed, 1 test passed.
  - `npm test -- tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts`
  - 3 test files passed, 21 tests passed.
  - Playwright smoke at `http://127.0.0.1:5207/?mode=resource3d-preview`: `vfxAudio.total=55`, `audioCueCount=126`, `particleLayerCount=177`, `phaseSynced=55`, `activeRuntime={category:projectiles, vfxAudioRoots:10, vfxAudioSyncAnchors:10}`.
- [x] V10 visible VFX playback layers have fresh evidence.
  - `npm test -- tests/resource3dFactory.test.ts`
  - 1 test file passed, 9 tests passed.
  - `npm test -- tests/resource3dPreview.test.ts`
  - 1 test file passed, 2 tests passed.
  - `npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts`
  - 3 test files passed, 24 tests passed.
  - `npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts`
  - 11 test files passed, 62 tests passed.
  - Playwright smoke at `http://127.0.0.1:5208/?mode=resource3d-preview`: `activeRuntime={category:aoe_indicators, vfxPlaybackGroups:10, vfxPlaybackLayers:42, vfxPlaybackLights:10, vfxPlaybackDecals:3}`.
- [x] V11 runtime VFX phase animation has fresh evidence.
  - `npm test -- tests/resource3dFactory.test.ts`
  - 1 test file passed, 11 tests passed.
  - `npm test -- tests/resource3dPreview.test.ts`
  - 1 test file passed, 2 tests passed.
  - `npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts`
  - 3 test files passed, 26 tests passed.
  - `npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts`
  - 11 test files passed, 64 tests passed.
  - Playwright smoke at `http://127.0.0.1:5209/?mode=resource3d-preview`: `activeRuntime={category:aoe_indicators, vfxPlaybackAnimated:10, vfxAnimatedLayers:42}`.
- [x] V13 runtime surface-material animation has focused evidence.
  - `npm test -- tests/resource3dFactory.test.ts`
  - 1 test file passed, 17 tests passed.
  - `npm test -- tests/resource3dPreview.test.ts`
  - 1 test file passed, 4 tests passed.
  - `npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts`
  - 11 test files passed, 72 tests passed.
  - Playwright smoke at `http://127.0.0.1:5211/?mode=resource3d-preview`: `activeRuntime={category:items, runtimeSurfaceAnimated:10, runtimeSurfaceMaterials:190, runtimeSurfaceGlints:180}`, global `runtimeSurface={runtimeSurfaceRoots:408, animatedRoots:408, animatedMaterials:9649, glintLayers:8889}`.
- [x] V14 hero runtime action/surface presentation has focused evidence.
  - `npm test -- tests/hero3dFactory.test.ts`
  - 1 test file passed, 4 tests passed.
  - `npm test -- tests/hero3dPreview.test.ts`
  - 1 test file passed, 1 test passed.
  - `npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts`
  - 3 test files passed, 13 tests passed.
  - `npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts`
  - 12 test files passed, 76 tests passed.
  - Playwright smoke at `http://127.0.0.1:5212/?mode=hero3d-preview`: `runtimePresentation={runtimeActionRoots:10, runtimeSurfaceRoots:10, animatedRoots:10, actionReactiveParts:232, surfaceMaterials:819, glintLayers:347, actionStates:{cast:10}}`.
- [x] V15 non-hero unit runtime presentation has focused evidence.
  - `npm test -- tests/resource3dFactory.test.ts`
  - 1 test file passed, 20 tests passed.
  - `npm test -- tests/resource3dPreview.test.ts`
  - 1 test file passed, 5 tests passed.
  - `npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts`
  - 12 test files passed, 80 tests passed.
  - Playwright smoke at `http://127.0.0.1:5213/?mode=resource3d-preview`: `runtimeUnitPresentation={runtimeUnitRoots:50, animatedRoots:50, animatedParts:620, animatedMaterials:1693, actionCues:50, actionStates:{attack:50}}`; active categories show lane `runtimeUnitMaterials=339`, neutral `runtimeUnitMaterials=384`, summon `runtimeUnitMaterials=320`.
- [x] V16 map runtime ambience has focused evidence.
  - `npm test -- tests/resource3dFactory.test.ts`
  - 1 test file passed, 23 tests passed.
  - `npm test -- tests/resource3dPreview.test.ts`
  - 1 test file passed, 6 tests passed.
  - `npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts tests/heroPreview.test.ts tests/tree3d.test.ts tests/resourceAssets.test.ts tests/resourceCatalog.test.ts tests/terrain3d.test.ts tests/vfx3d.test.ts`
  - 5 existing test files matched and passed, 47 tests passed.
  - `npm test -- tests/render3d`
  - 10 test files passed, 53 tests passed.
  - Playwright smoke at `http://127.0.0.1:5214/?mode=resource3d-preview`: `runtimeMapPresentation={runtimeMapRoots:58, animatedRoots:58, animatedMaterials:1156, ambienceCues:58, mapClasses:{river-corridor:9, tree-wall:9, ambient-fx:4, sky-atmosphere:6, highground-edge:10, grass-flower:7, map-prop:4, fence-blocker:2, flat-ground:7}}`; active `environment_fx` shows `runtimeMapRoots=15`, `runtimeMapMaterials=210`, `runtimeMapAmbienceCues=15`.
- [x] V17 combat FX readability has focused evidence.
  - `npm test -- tests/resource3dFactory.test.ts`
  - 1 test file passed, 26 tests passed.
  - `npm test -- tests/resource3dPreview.test.ts`
  - 1 test file passed, 7 tests passed.
  - `npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts`
  - 6 test files passed, 60 tests passed.
  - Playwright smoke at `http://127.0.0.1:5215/?mode=resource3d-preview`: `runtimeFxReadability={runtimeFxRoots:50, animatedRoots:50, animatedMaterials:810, readabilityCues:50, fxClasses:{spell-burst:10, projectile-path:10, area-telegraph:10, status-aura:10, targeting-reticle:10}}`; active `aoe_indicators` shows `runtimeFxRoots=10`, `runtimeFxMaterials=140`, `runtimeFxReadabilityCues=10`.
- [x] Build has fresh evidence.
  - `npm run build` passed.
  - Vite still reports the existing large chunk warning.

### Suggested Priority For Opus

1. Review and merge the UI/asset/control slice as a branch, not as a preview-only patch.
2. Resolve route/dependency conflicts in `src/main.ts`, `package.json`, and `package-lock.json`.
3. Lazy-load Three.js preview modules if the branch is going near production.
4. Choose the first production-asset lane:
   - Recommended: `lane_units`, `buildings`, `terrain_tiles`, `projectiles`, `aoe_indicators`, then `ability_icons`.
5. Consume the V8 runtime hooks before replacing samples with GLB/PBR:
   - `gameEntityKey -> hero/resource asset key`
   - `hero asset -> root.userData.runtimeAction`
   - `hero asset -> root.userData.runtimeSurface`
   - `hero asset -> updateHeroRuntimePresentation(root, actionName, elapsedMs)`
   - `hero part -> obj.userData.heroRuntimePart`
   - `hero material -> material.userData.heroRuntimeSurfaceMaterial`
   - `hero material -> material.userData.runtimeHeroSurfaceShaderIntent`
   - `hero preview -> window.__hero3dPreview.runtimePresentation`
   - `resource category -> renderer layer`
   - `terrain/map prop -> root.userData.runtimeIntegration`
   - `terrain/map prop -> resource3d:v8-footprint:<assetKey>`
  - `resource asset -> resource3d:v8-lod-anchor:<assetKey>`
  - `resource asset -> Resource3DAssetSpec.production`
  - `resource asset -> Resource3DAssetSpec.vfxAudio`
  - `resource asset -> resource3d:v9-vfx-audio-sync:<assetKey>`
  - `resource asset -> resource3d:v10-vfx-playback:<assetKey>`
  - `resource asset -> resource3d:v10-vfx-layer:<assetKey>:<role>`
  - `resource asset -> resource3d:v10-vfx-light:<assetKey>`
  - `resource asset -> resource3d:v10-vfx-decal:<assetKey>`
  - `resource asset -> updateResourceVfxPlayback(root, elapsedMs)`
  - `resource asset -> root.userData.runtimeMotion`
  - `resource asset -> updateResourceRuntimeMotion(root, elapsedMs)`
  - `resource asset -> root.userData.runtimeSurface`
  - `resource asset -> updateResourceRuntimeSurface(root, elapsedMs)`
  - `resource material -> material.userData.runtimeSurfaceGlintLayer`
  - `resource material -> material.userData.runtimeSurfaceShaderIntent`
  - `resource unit asset -> root.userData.runtimeUnitPresentation`
  - `resource unit asset -> updateResourceRuntimeUnitPresentation(root, actionState, elapsedMs)`
  - `resource unit real-play bridge -> root.userData.gameplayRuntimeBridge`
  - `resource unit real-play bridge -> src/render3d/resource3dModel.ts buildResource3DUnitModel(...).applyPose(...)`
  - `resource unit cue -> resource3d:v15-unit-action-cue:<assetKey>`
  - `resource unit cue -> object.userData.resourceRuntimeUnitActionCue`
  - `resource unit preview -> window.__resource3dPreview.runtimeUnitPresentation`
  - `resource unit active category -> window.__resource3dPreview.activeRuntime.runtimeUnit*`
  - `resource map asset -> root.userData.runtimeMapPresentation`
  - `resource map asset -> updateResourceRuntimeMapPresentation(root, elapsedMs)`
  - `resource map cue -> resource3d:v16-map-ambience-cue:<assetKey>`
  - `resource map cue -> object.userData.resourceRuntimeMapAmbienceCue`
  - `resource map preview -> window.__resource3dPreview.runtimeMapPresentation`
  - `resource map active category -> window.__resource3dPreview.activeRuntime.runtimeMap*`
  - `resource combat FX asset -> root.userData.runtimeFxReadability`
  - `resource combat FX asset -> updateResourceRuntimeFxReadability(root, elapsedMs)`
  - `resource combat FX cue -> resource3d:v17-fx-readability-cue:<assetKey>`
  - `resource combat FX cue -> object.userData.resourceRuntimeFxReadabilityCue`
  - `resource combat FX preview -> window.__resource3dPreview.runtimeFxReadability`
  - `resource combat FX active category -> window.__resource3dPreview.activeRuntime.runtimeFx*`
  - `sound cue marker -> final audio event id`

Changed files:

- `src/render/resource3dAssets.ts`
  - New category/resource sample contract.
  - Adds V5 lane-unit readability contracts and visible lane identity-anchor part generation.
  - Adds V5 wild-creature readability contracts for neutral units and boss/objectives.
  - Adds V5 support-object readability contracts for couriers, summons, wards, traps, illusions, and totems.
  - Adds V7 `placement`, `lod`, and `production` integration metadata for all 408 resource samples.
  - Adds replacement-ready `public/assets/tree3d/resources/<category>/<assetKey>/...` model/texture path conventions.
  - Adds V9 `vfxAudio` contracts for spell FX, projectiles, AoE indicators, environment FX, and sound cue markers.
  - Adds future production-path conventions for `public/assets/tree3d/audio/resources/<category>/<assetKey>/<event>.ogg`.
- `src/render/resource3dFactory.ts`
  - Procedural Three.js resource model factory.
  - Exposes lane-unit, wild-creature, and support-object readability on Resource3D model `userData`.
  - Removes the previous resource material `side: undefined` warning.
  - Adds V6 resource surface realism: contact shadows, material glints, normal/rim/contact/wear profile terms.
  - Adds V8 runtime consumption of V7 `placement`, `lod`, and `production` metadata on generated resource roots.
  - Adds named runtime footprint and LOD-anchor hooks for Opus inspection.
  - Adds V9 runtime consumption of `vfxAudio` metadata and named VFX/audio sync anchors.
  - Adds V10 visible VFX playback roots, particle-layer meshes, light hints, and decal hooks.
  - Adds V11 `updateResourceVfxPlayback(root, elapsedMs)` for phase-timed layer/light/decal animation.
  - Adds V12 `runtimeMotion` contracts plus `updateResourceRuntimeMotion(root, elapsedMs)` for deterministic all-resource motion.
  - Adds V13 `runtimeSurface` contracts plus `updateResourceRuntimeSurface(root, elapsedMs)` for deterministic runtime material animation.
  - Adds V15 `runtimeUnitPresentation` contracts plus `updateResourceRuntimeUnitPresentation(root, actionState, elapsedMs)` for non-hero unit action posture, threat cues, support expiration, and material response.
  - Adds V16 `runtimeMapPresentation` contracts plus `updateResourceRuntimeMapPresentation(root, elapsedMs)` for terrain/map/environment ambience, river flow, sky haze, tree-wall occlusion, highground depth, and material response.
  - Adds V17 `runtimeFxReadability` contracts plus `updateResourceRuntimeFxReadability(root, elapsedMs)` for combat FX readability, projectile paths, AoE telegraphs, status auras, target reticles, and material response.
- `src/render3d/resource3dModel.ts`
  - Bridges Resource3D unit assets into the real 3D play-route `UnitModel` contract.
  - V21 calls `updateResourceRuntimeUnitPresentation(...)` from real `applyPose(...)`.
  - V21 maps gameplay pose states to runtime unit states and adds `root.userData.gameplayRuntimeBridge` for Opus inspection.
  - V21 normalizes `runtimeUnitPresentation.baseRootScale` under the gameplay scaler.
- `src/render/hero3dAssets.ts`
  - Adds V5 hero readability contracts and visible identity-anchor part generation for the first 10 classic heroes.
- `src/render/hero3dFactory.ts`
  - Uses explicit `FrontSide` for non-aura materials, removing the previous Three.js `side: undefined` warning.
  - Adds V6 hero surface realism: contact shadows, material glints, and exported `heroMaterialSurfaceProfile(...)`.
  - Adds V14 `runtimeAction` / `runtimeSurface` contracts plus `updateHeroRuntimePresentation(root, actionName, elapsedMs)` for deterministic hero action posture and material response.
  - Tags hero parts and materials with runtime metadata for Opus inspection and future GLB/PBR replacement.
- `src/ui/hero3dPreview.ts`
  - Exposes V5 readability smoke data through `window.__hero3dPreview.readability`.
  - Exposes V6 surface realism smoke data through `window.__hero3dPreview.surfaceRealism`.
  - Calls V14 `updateHeroRuntimePresentation(...)` each frame and refreshes `window.__hero3dPreview.runtimePresentation`.
- `src/ui/resource3dPreview.ts`
  - Category-tabbed preview page.
  - Exposes lane-unit V5 readability smoke data through `window.__resource3dPreview.laneReadability`.
  - Exposes wild-creature and support-object V5 smoke data through `window.__resource3dPreview.wildReadability` and `supportReadability`.
  - Exposes V6 surface realism smoke data through `window.__resource3dPreview.surfaceRealism`.
  - Exposes V7 placement/LOD/production smoke data through `window.__resource3dPreview.integration`.
  - Exposes V8 current-category runtime consumption smoke data through `window.__resource3dPreview.activeRuntime`.
  - Exposes V9 VFX/audio aggregate smoke data through `window.__resource3dPreview.vfxAudio`.
  - Extends `activeRuntime` with current-category VFX/audio root, sync-anchor, audio-cue, particle-layer, and phase-sync counts.
  - Extends `activeRuntime` with V10 playback group, layer, light-hint, and decal counts.
  - Calls V11 `updateResourceVfxPlayback(...)` each frame and refreshes animated playback smoke counts.
  - Calls V12 `updateResourceRuntimeMotion(...)` each frame and refreshes runtime motion smoke counts.
  - Calls V13 `updateResourceRuntimeSurface(...)` each frame and refreshes runtime surface smoke counts.
  - Calls V15 `updateResourceRuntimeUnitPresentation(...)` each frame and refreshes runtime unit smoke counts.
  - Calls V16 `updateResourceRuntimeMapPresentation(...)` each frame and refreshes runtime map ambience smoke counts.
  - Calls V17 `updateResourceRuntimeFxReadability(...)` each frame and refreshes runtime FX readability smoke counts.
- `src/main.ts`
  - Adds route-gated previews and renderer/UX wiring.
- `src/render3d/fx3dVisual.ts`
  - Pure 3D FX layer contract from `fxStyle` family/pattern metadata.
  - Adds V5 `phaseContract` for windup / impact / linger / fade and danger-shape mapping.
- `src/render3d/fx3d.ts`
  - Runtime multi-layer 3D FX and projectile group renderer.
  - Consumes V5 phase opacity/scale timing and names runtime groups/layers for smoke inspection.
- `src/render3d/terrainDressing.ts`
  - Pure deterministic terrain dressing sampler for V4 map realism.
- `src/render3d/terrain3d.ts`
  - Adds V4 named map layers: sky, cloud shadows, horizon haze, sun shafts, river current, wet riverbanks, foam/glints, ground dirt paths, grass mottle, stone slabs, tree canopies, Radiant/Dire tree biome accents, grass, flowers, reeds, river stones, layered cliff faces, cliff side tint/rubble/cracks, layered blockers, highground edges, ramp stairs, landmark rings.
  - Exposes `updateTerrainRuntimeMotion(root, t)` for visual-only river current drift, foam pulsing, and reed sway.
- `src/render/commandQueuePath.ts`
  - 2D queued route visual.
- `src/render3d/commandQueue3d.ts`
  - 3D queued route visual.
- `src/sim/unit.ts`
  - Queued order state and advancement for shift-queue controls.
- `src/engine/input.ts`
  - Shift-modified command appending for movement/attack/ability/item flows.
- `tests/resource3dAssets.test.ts`
  - Locks full category coverage, at least 10 samples per category, renderability, variety, unique keys, terrain subtype coverage, and V7 placement/LOD/production contracts.
  - Locks V9 VFX/audio contract coverage and Dota-like danger/cue semantics.
- `tests/resource3dFactory.test.ts`
  - Locks resource surface realism profile terms, runtime part-motion tags, and V8 runtime consumption of placement/LOD/production metadata.
  - Locks V9 generated-root `vfxAudio` consumption and sync-anchor metadata.
  - Locks V10 visible playback roots, particle layers, phase timelines, light hints, and radius decals.
  - Locks V11 windup / impact / fade animation behavior for layers, lights, and decals.
  - Locks V12 runtime motion contracts, non-drifting part motion, and distinct impact/spin reads.
  - Locks V13 runtime surface contracts, non-drifting material animation, and V12/V13 pulse composition.
  - Locks V15 runtime unit presentation contracts, action-cue metadata, non-drifting lane attacks, support expiration, and boss threat pulses.
  - Locks V16 runtime map ambience contracts, cue metadata, non-drifting river/sky ambience, tree-wall occlusion, and highground depth pulses.
  - Locks V17 runtime combat FX readability contracts, cue metadata, non-drifting projectile/AoE pulses, status pulse, and invalid-target emphasis.
- `tests/resource3dPreview.test.ts`
  - Locks V9 preview smoke aggregation for browser and Opus handoff checks.
  - Locks V10 preview smoke aggregation from generated runtime models.
  - Locks V11 animated playback smoke aggregation.
  - Locks V12 runtime motion smoke aggregation.
  - Locks V15 runtime unit presentation smoke aggregation.
- `tests/render3d/resource3dModel.test.ts`
  - V21 locks that the real `buildResource3DUnitModel(...).applyPose(...)` path routes through `updateResourceRuntimeUnitPresentation(...)`.
  - Verifies Dawn melee creep attack pose produces runtime unit state, animated parts/materials, action cue, threat pulse, normalized base scale, and gameplay bridge metadata.
  - Locks V13 runtime surface smoke aggregation.
  - Locks V15 runtime unit presentation smoke aggregation.
  - Locks V16 runtime map ambience smoke aggregation.
  - Locks V17 runtime combat FX readability smoke aggregation.
- `tests/hero3dFactory.test.ts`
  - Locks V6 hero surface profile terms.
  - Locks V14 hero root action/surface contracts, runtime material tags, non-drifting cast pulses, invisible opacity, stunned jitter, and death posture.
- `tests/hero3dPreview.test.ts`
  - Locks V14 hero runtime action/surface smoke aggregation for browser and Opus handoff checks.
- `docs/screenshots/ux-resource3d-preview.png`
  - Current preview screenshot evidence.
- `docs/screenshots/ux-resource3d-terrain-preview.png`
  - Terrain tile evidence for flat ground, flower meadow, slopes/ramps, riverbank, riverbed, and fence foundations.
- `docs/screenshots/ux-resource3d-map-props-preview.png`
  - Map prop evidence for trees, grass, flowers, fences, high-ground stairs, and river bridge props.
- `docs/screenshots/ux-resource3d-environment-preview.png`
  - Environment evidence for sky domes, cloud shadows, sun shafts, and pollen wind.
- `docs/screenshots/ux-resource3d-feedback-preview.png`
  - UX feedback evidence for ability icon style; adjacent categories cover targeting reticles, combat numbers, health/mana UI, overlays, announcements, shop/inventory UI, and sound cue markers.
- `docs/screenshots/ux-resource3d-match-ui-preview.png`
  - Match-shell evidence for hero roster UI; adjacent categories cover level/talent UI, death recap, scoreboard, match flow, cursor commands, system notifications, and tutorial guides.
- `docs/screenshots/ux-3d-v9-vfx-audio-contract.png`
  - V9 VFX/audio contract preview evidence for projectiles and runtime sync anchors.
- `docs/screenshots/ux-3d-v10-vfx-playback-layers.png`
  - V10 VFX playback evidence for AoE indicators, visible playback layers, light hints, and decals.
- `docs/screenshots/ux-3d-v11-vfx-phase-animation.png`
  - V11 VFX phase-animation evidence for AoE indicators and animated playback smoke.
- `docs/screenshots/ux-3d-v12-runtime-motion.png`
  - V12 runtime motion evidence for map props and animated resource-part smoke.
- `docs/screenshots/ux-3d-v13-runtime-surface.png`
  - V13 runtime surface evidence for items, animated material smoke, and glint layers.
- `docs/screenshots/ux-3d-v14-hero-runtime-presentation.png`
  - V14 hero runtime presentation evidence for cast state, action-reactive parts, surface materials, and glint layers.
- `docs/screenshots/ux-3d-v15-unit-runtime-presentation.png`
  - V15 non-hero unit runtime presentation evidence for lane/neutral/summon categories, action cues, runtime unit parts, and material response.
- `docs/screenshots/ux-3d-v16-map-runtime-ambience.png`
  - V16 map runtime ambience evidence for terrain/map/environment categories, ambience cues, runtime map materials, and environment FX preview.
- `docs/screenshots/ux-3d-v17-combat-fx-readability.png`
  - V17 combat FX readability evidence for AoE indicators, readable warning rings, direction cues, runtime FX materials, and readability cues.
- `docs/ux/2026-06-13-resource3d-phase1-summary.md`
  - Phase summary and future production-asset plan.
- `docs/ux/2026-06-13-3d-v3-resource-polish-summary.md`
  - V3 material/detail/texture, model motion, part motion, and 3D FX polish summary.
- `docs/ux/2026-06-13-shift-queue-controls-summary.md`
  - Shift queue control UX summary.
- `docs/ux/2026-06-13-dota-map-elements-research-target.md`
  - Dota-informed map element research target.
- `docs/ux/2026-06-13-3d-v4-map-terrain-realism-summary.md`
  - V4 map terrain realism summary, screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v5-skill-fx-phase-summary.md`
  - V5 skill/battle-FX phase contract summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v6-surface-realism-summary.md`
  - V6 hero/resource surface realism summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v7-resource-integration-contract-summary.md`
  - V7 resource placement/LOD/production contract summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v8-resource-runtime-consumption-summary.md`
  - V8 resource runtime consumption summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v9-vfx-audio-sync-summary.md`
  - V9 VFX/audio sync contract summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v10-vfx-playback-layers-summary.md`
  - V10 visible VFX playback layers summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v11-vfx-phase-animation-summary.md`
  - V11 runtime VFX phase-animation summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v12-runtime-motion-summary.md`
  - V12 all-resource runtime motion summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v13-runtime-surface-summary.md`
  - V13 runtime surface-material animation summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v14-hero-runtime-presentation-summary.md`
  - V14 hero runtime action/surface presentation summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v15-unit-runtime-presentation-summary.md`
  - V15 non-hero unit runtime presentation summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v16-map-runtime-ambience-summary.md`
  - V16 map runtime ambience summary, runtime screenshot evidence, and Opus handoff.
- `docs/ux/2026-06-14-3d-v17-combat-fx-readability-summary.md`
  - V17 combat FX readability summary, runtime screenshot evidence, and Opus handoff.
- `tests/hero3dFactory.test.ts`
  - Locks hero surface realism profile terms and V14 runtime presentation contracts.
- `tests/render3d/fx3dRuntime.test.ts`
  - Locks runtime FX group/layer naming for Opus smoke checks.

`src/sim/**` changes in this branch are limited to queued-order control plumbing and related tests; no combat/math/pathing tuning is intended.

## Why

After the Hero3D pass, the next art requirement is to cover all other game resource types without trying to finish production assets in one jump.

This gives Opus a stable preview and data contract for non-hero resources now, while also providing the UX/control visual layer needed for queued commands and 3D combat readability. It lets the team replace procedural samples category by category with GLB/PBR assets later.

## Tradeoff

Chosen approach: 408 procedural Three.js samples with strict metadata and a tabbed preview.

Why this approach:

- Covers all major visible resource types quickly.
- Gives Opus a broader taxonomy for gameplay systems: objectives, NPCs, summons, consumables, traps, projectile/VFX layers, drops, minimap markers, and team banners.
- Terrain coverage is now explicit rather than implied: flat ground, trees, grass, flowers, high ground, fences, slopes/ramps, river/riverbanks, sky domes, cloud shadows, and sky lighting all have in-project samples.
- UX feedback coverage now includes ability icons, targeting reticles, combat numbers, health/mana bars, screen overlays, announcements, shop/inventory UI, and sound cue markers.
- Match-shell UX coverage now includes hero roster, level/talent UI, death recap, scoreboard, match flow, cursor commands, system notifications, and tutorial guides.
- Lets each type be reviewed independently.
- Keeps every sample in-project and directly previewable.
- Avoids blocking on final modeling, rigging, or texture production.
- Adds runtime visual polish only where it improves asset/control readability: queued routes, unit resource motion, part motion, and layered 3D FX.

Alternatives considered:

- Build final GLB packs immediately.
  - Deferred. This branch is for art-direction sampling and integration contracts.
- Put all 408 samples on one canvas at once.
  - Rejected for readability. The preview uses category tabs so each type can be inspected cleanly.
- Fully replace gameplay visuals with production assets immediately.
  - Deferred to avoid collision with Opus mainline work and because the GLB/PBR pipeline is not defined yet.

Known cost:

- Three.js remains statically imported through preview modules, so the Vite bundle still reports a large chunk warning.
- Recommended follow-up: lazy-load `hero3dPreview.ts` and `resource3dPreview.ts` behind query routes.

## Open Questions

1. Which resource categories should be promoted to real GLB first: lane units/buildings/spell FX/terrain, or another order?
2. Should `spell_fx` remain in the same resource contract as model assets, or split into a dedicated VFX contract later?
3. Should item resources become shop icon 3D previews, inventory icons, or both?
4. Should the map renderer/pathing layer consume V8 `root.userData.runtimeIntegration` immediately, or wait until authored GLB/PBR map props land?
5. Should the current procedural assets stay as fallback/debug assets after production art arrives?
6. Should `projectiles`, `aoe_indicators`, and `environment_fx` eventually move into a dedicated VFX runtime contract?
7. Should V8 `resource3d:v8-lod-anchor:*` drive runtime LOD switching in this renderer, or only feed the future `tree3d.js` production loader?
8. Which first 10 heroes should stay in the immediate V5 polish batch if Opus changes the roster order?

## Next Action

Suggested Opus integration flow:

1. Review `src/main.ts` route additions:
   - `?mode=hero3d-preview`
   - `?mode=resource3d-preview`
2. Treat `src/sim/unit.ts` queued-order changes as UX/control plumbing; keep unrelated sim/combat/pathing changes out of the merge.
3. Run:

```bash
npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
npm run build
npm test -- --pool=forks --maxWorkers=1
```

4. Open:

```text
http://127.0.0.1:<port>/?mode=hero3d-preview
http://127.0.0.1:<port>/?mode=resource3d-preview
```

5. Use the category tabs to review all 38 resource groups.
6. Also open the 3D play route and verify shift-queued routes plus layered FX in a live scene.
7. If merging into main, consider lazy-loading preview modules to reduce the main chunk before production release.

After V4 terrain merge review, recommended next UX/art sequence:

1. V5 hero polish for the existing first 10 classic heroes: completed as a first-read/readability pass.
2. V5 lane creep melee/ranged/siege polish for both teams: completed as a role/faction/readability pass.
3. V5 neutral creep and boss tier polish: completed as a tier/biome/threat-read pass.
4. V5 summon and ward polish: completed as an owner/interaction/low-priority pass.
5. Skill and battle-FX timing/layer polish: completed as a phase/danger-shape contract pass.
6. V6 cross-asset surface realism: completed as a contact-shadow/material-glint pass.
7. V7 resource production integration metadata: completed as a placement/LOD/tree3d-path contract pass.
8. V8 resource runtime consumption: completed as generated-root userData, footprint-ring, and LOD-anchor hooks.
9. V9 VFX/audio sync contracts: completed as asset metadata, generated-root userData, sync anchors, and preview smoke hooks.
10. V10 visible VFX playback layers: completed as generated playback roots, layer meshes, light hints, decals, and preview smoke hooks.
11. V11 runtime VFX phase animation: completed as centralized windup / impact / linger / fade updates for playback layers, lights, decals, and preview smoke hooks.
12. V12 all-resource runtime motion: completed as deterministic root/part motion, surface-reactive motion metadata, and preview smoke hooks.
13. V13 runtime surface-material animation: completed as deterministic material pulses, cached base material values, shader-intent contracts, and preview smoke hooks.
14. V14 hero runtime action/surface presentation: completed as deterministic hero posture/material response, action-state contracts, shader-intent contracts, and preview smoke hooks.
15. V15 non-hero unit runtime presentation: completed as deterministic lane/wild/boss/support action posture, threat/expiration cue contracts, and preview smoke hooks.
16. V16 map runtime ambience: completed as deterministic terrain/map/environment ambience, river/sky/tree/highground class contracts, visible ambience cues, and preview smoke hooks.
17. V17 combat FX readability: completed as deterministic spell/projectile/AoE/status/reticle readability, danger-read contracts, visible FX cues, and preview smoke hooks.
18. V21 real-play resource runtime bridge: completed as `src/render3d/resource3dModel.ts` consumption of `updateResourceRuntimeUnitPresentation(...)` for mapped non-hero units in `?mode=play&renderer=3d`.

## Verification Evidence

Latest verified commands in this worktree:

```text
npm test -- tests/render3d/resource3dModel.test.ts tests/resource3dPreview.test.ts
2 files passed
8 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

V21 red-to-green evidence:

```text
npm test -- tests/render3d/resource3dModel.test.ts
Before fix: 1 failed
- expected gameplayRuntimeBridge to match updateResourceRuntimeUnitPresentation
```

Real play-route V21 evidence:

```text
URL: http://127.0.0.1:5230/?mode=play&hero=rein&renderer=3d&seed=42&speed=0
Console/page errors: none
Injected unit: kind=creep, team=Dawn, name=近战兵
Scene root: resource3d:dawn_melee_creep found
gameplayRuntimeBridge.runtimeHelper: updateResourceRuntimeUnitPresentation
runtimeUnitState: attack
runtimeUnitAnimated: true
runtimeUnitAnimatedParts: 12
runtimeUnitAnimatedMaterials: 35
runtimeUnitActionCues: 1
runtimeUnitThreatPulse: 0.17
Screenshot: docs/screenshots/ux-3d-v21-resource-runtime-bridge.png
```

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
26 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
7 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts
6 files passed
60 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts tests/heroPreview.test.ts tests/tree3d.test.ts tests/resourceAssets.test.ts tests/resourceCatalog.test.ts tests/terrain3d.test.ts tests/vfx3d.test.ts
5 existing files matched and passed
47 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
Playwright smoke at http://127.0.0.1:5215/?mode=resource3d-preview
runtimeFxReadability={runtimeFxRoots:50, animatedRoots:50, animatedMaterials:810, readabilityCues:50}
active aoe_indicators={runtimeFxRoots:10, runtimeFxMaterials:140, runtimeFxReadabilityCues:10}
```

```text
Screenshot evidence
docs/screenshots/ux-3d-v17-combat-fx-readability.png
```

```text
npm test -- tests/resource3dAssets.test.ts
1 file passed
9 tests passed
```

```text
npm test -- tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
7 files passed
44 tests passed
```

```text
npm test -- tests/render3d/fx3dVisual.test.ts tests/fxstyle.test.ts tests/fxlayer.test.ts
3 files passed
40 tests passed
```

```text
npm test -- tests/render3d/fx3dVisual.test.ts tests/fxstyle.test.ts tests/fxlayer.test.ts tests/render3d/resourceMotion.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts tests/commandMode.test.ts
9 files passed
71 tests passed
```

```text
npm test -- tests/render3d/terrainDressing.test.ts
1 file passed
11 tests passed
```

```text
npm run typecheck
passed
```

```text
npm test -- tests/render3d/terrainDressing.test.ts tests/resource3dAssets.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
6 files passed
33 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
npm test -- --pool=forks --maxWorkers=1
105 files passed
907 tests passed
```

```text
Note: `npm test -- --run --pool=forks` previously reported all files passed in this worktree, but exited non-zero from a Vitest worker RPC shutdown timeout (`Timeout calling "onTaskUpdate"`). The single-worker fork command above is the clean full-suite evidence.
```

Preview smoke evidence:

```json
{
  "categories": ["lane_units", "neutral_units", "boss_objectives", "buildings", "shops_npcs", "couriers_summons", "items", "item_components", "consumables", "wards_traps", "spell_fx", "projectiles", "aoe_indicators", "environment_fx", "map_props", "runes_powerups", "pickups_drops", "status_effects", "ability_icons", "targeting_reticles", "combat_numbers", "health_mana_ui", "screen_overlays", "announcements", "shop_inventory_ui", "sound_cue_markers", "hero_roster_ui", "level_talent_ui", "death_recap_ui", "scoreboard_ui", "match_flow_ui", "cursor_commands", "system_notifications", "tutorial_guides", "ui_badges", "terrain_tiles", "minimap_markers", "team_banners"],
  "total": 408,
  "counts": {
    "lane_units": 10,
    "neutral_units": 10,
    "boss_objectives": 10,
    "buildings": 10,
    "shops_npcs": 10,
    "couriers_summons": 10,
    "items": 10,
    "item_components": 10,
    "consumables": 10,
    "wards_traps": 10,
    "spell_fx": 10,
    "projectiles": 10,
    "aoe_indicators": 10,
    "environment_fx": 15,
    "map_props": 21,
    "runes_powerups": 10,
    "pickups_drops": 10,
    "status_effects": 10,
    "ability_icons": 10,
    "targeting_reticles": 10,
    "combat_numbers": 10,
    "health_mana_ui": 10,
    "screen_overlays": 10,
    "announcements": 10,
    "shop_inventory_ui": 10,
    "sound_cue_markers": 10,
    "hero_roster_ui": 10,
    "level_talent_ui": 10,
    "death_recap_ui": 10,
    "scoreboard_ui": 10,
    "match_flow_ui": 10,
    "cursor_commands": 10,
    "system_notifications": 10,
    "tutorial_guides": 10,
    "ui_badges": 10,
    "terrain_tiles": 22,
    "minimap_markers": 10,
    "team_banners": 10
  }
}
```

V3 3D FX runtime evidence:

```text
Playwright @ http://127.0.0.1:5189/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Injected FX: fireblast, frostnova, lightning, miasma, purification, arcanebolt
Scene objects: 2075
Canvas count: 2
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v3-fx-polish.png
```

V5 hero readability runtime evidence:

```text
Playwright @ http://127.0.0.1:5200/?mode=hero3d-preview
Hero count: 10
Readability contracts: 10
Anchors per hero: 6
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-hero-readability.png
```

V5 lane-unit readability runtime evidence:

```text
Playwright @ http://127.0.0.1:5201/?mode=resource3d-preview
Lane unit count: 10
Lane readability contracts: 10
Anchors per lane unit: 6
Role classes: melee, ranged, siege, super, utility, scout
Team reads: dawn, night, neutral
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-lane-unit-readability.png
```

V5 neutral / boss readability runtime evidence:

```text
Playwright @ http://127.0.0.1:5202/?mode=resource3d-preview
Wild readability contracts: 20
Neutral units: 10
Boss/objectives: 10
Tiers: ancient, boss, large, medium, objective, small, special
Pack roles: ancient, boss-core, caster, flying, fodder, leader, objective-mechanic
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-neutral-boss-readability.png
```

V5 summon / ward readability runtime evidence:

```text
Playwright @ http://127.0.0.1:5202/?mode=resource3d-preview
Support readability contracts: 20
Summons/couriers: 10
Wards/traps: 10
Role classes: courier, illusion, summon, totem, trap, ward
Priority bands: low, medium
Max visual priority: 0.56
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v5-summon-ward-readability.png
```

V6 surface realism runtime evidence:

```text
Playwright @ http://127.0.0.1:5204/?mode=hero3d-preview
Hero count: 10
Contact shadows: 10
Surface glints: 168
Rim-eligible hero parts: 180
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v6-hero-surface-realism.png
```

```text
Playwright @ http://127.0.0.1:5204/?mode=resource3d-preview
Resource total: 408
Contact shadows: 408
Glint-eligible resource parts: 2366
Max contact shadow opacity: 0.42
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v6-resource-surface-realism.png
```

V7 resource integration contract evidence:

```text
npm test -- tests/resource3dAssets.test.ts
1 file passed
11 tests passed
```

```text
Playwright @ http://127.0.0.1:5205/?mode=resource3d-preview
Production-ready fallback contracts: 408
LOD contracts: 408
Placement layers: unit=40, building=20, prop=81, fx=85, projectile=10, ui=130, marker=20, terrain=22
River contracts: 11
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v7-resource-integration-contract.png
```

V8 resource runtime consumption evidence:

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
6 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts
2 files passed
17 tests passed
```

```text
Playwright @ http://127.0.0.1:5206/?mode=resource3d-preview
Active category: terrain_tiles
Resource count: 22
Runtime roots: 22
Footprints: 22
LOD anchors: 22
River runtime contracts: 3
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v8-resource-runtime-consumption.png
```

V9 VFX/audio sync contract evidence:

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
1 test passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts
3 files passed
21 tests passed
```

```text
Playwright @ http://127.0.0.1:5207/?mode=resource3d-preview
VFX/audio contracts: 55
By category: spell_fx=10, projectiles=10, aoe_indicators=10, environment_fx=15, sound_cue_markers=10
Audio cue contracts: 126
Particle layer contracts: 177
Phase-synced resources: 55
Active category: projectiles
Runtime VFX/audio roots: 10
Runtime VFX/audio sync anchors: 10
Active category audio cues: 21
Active category particle layers: 34
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v9-vfx-audio-contract.png
```

V10 visible VFX playback layer evidence:

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
9 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
2 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts
3 files passed
24 tests passed
```

```text
Playwright @ http://127.0.0.1:5208/?mode=resource3d-preview
Active category: aoe_indicators
Resource count: 10
VFX/audio roots: 10
VFX/audio sync anchors: 10
Audio cue contracts: 30
Particle layer contracts: 42
VFX playback groups: 10
VFX playback layers: 42
VFX playback light hints: 10
VFX playback decals: 3
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v10-vfx-playback-layers.png
```

V11 runtime VFX phase-animation evidence:

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
11 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
2 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts
3 files passed
26 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
11 files passed
64 tests passed
```

```text
npm test -- --pool=forks --maxWorkers=1
105 files passed
899 tests passed
```

```text
Playwright @ http://127.0.0.1:5209/?mode=resource3d-preview
Active category: aoe_indicators
Resource count: 10
VFX/audio roots: 10
VFX/audio sync anchors: 10
VFX playback groups: 10
VFX playback layers: 42
VFX playback light hints: 10
VFX playback decals: 3
Animated playback groups: 10
Animated layers: 42
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v11-vfx-phase-animation.png
```

V12 all-resource runtime motion evidence:

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
14 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
3 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts
3 files passed
30 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
11 files passed
68 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
npm test -- --pool=forks --maxWorkers=1
105 files passed
903 tests passed
```

```text
Playwright @ http://127.0.0.1:5210/?mode=resource3d-preview
Active category: map_props
Resource count: 21
Runtime motion roots: 21
Runtime motion animated roots: 21
Runtime motion animated parts: 189
Runtime motion surface-reactive parts: 147
Global runtime motion roots: 408
Global motion intents: idle-breathe=32, pulse-energy=115, ambient-sway=94, float-hover=68, impact-hit=65, spin-showcase=34
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v12-runtime-motion.png
```

V13 runtime surface-material evidence:

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
17 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
4 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts tests/resource3dFactory.test.ts
2 files passed
21 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
11 files passed
72 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
Playwright @ http://127.0.0.1:5211/?mode=resource3d-preview
Active category: items
Resource count: 10
Runtime surface roots: 10
Runtime surface animated roots: 10
Runtime surface animated materials: 190
Runtime surface reactive materials: 190
Runtime surface glints: 180
Global runtime surface roots: 408
Global animated roots: 408
Global animated materials: 9649
Global reactive materials: 9649
Global glint layers: 8889
Shader intents: cloth-dye-breathe=108, water-caustic-flow=9, metal-rim-sweep=196, energy-fresnel-pulse=95
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v13-runtime-surface.png
```

```text
npm test -- --pool=forks --maxWorkers=1
105 files passed
907 tests passed
```

V4 3D map terrain runtime evidence:

```text
Playwright @ http://127.0.0.1:5190/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Runtime layers:
terrain-sky-dome: 1
terrain-cloud-shadows: 5
terrain-atmosphere: 10
terrain-horizon-haze: 4
terrain-sun-shafts: 6
terrain-river-current: 9
terrain-river-bank-mud: 250
terrain-river-foam-glints: 189
terrain-ground-decals: 2182
terrain-ground-dirt-paths: 1306
terrain-ground-grass-mottle: 483
terrain-ground-stone-slabs: 393
terrain-tree-trunks: 2800
terrain-tree-canopy-primary: 2800
terrain-tree-canopy-secondary: 5600
terrain-tree-biome-accents: 3470
terrain-tree-radiant-light-canopy: 1171
terrain-tree-radiant-blooms: 586
terrain-tree-dire-dark-canopy: 1142
terrain-tree-dire-dead-branches: 571
terrain-grass-tufts: 3672
terrain-flower-patches: 651
terrain-river-reeds: 275
terrain-river-stones: 273
terrain-cliff-faces: 316
terrain-cliff-face-walls: 316
terrain-cliff-rock-caps: 316
terrain-cliff-ledge-shadows: 316
terrain-cliff-biome-details: 803
terrain-cliff-radiant-moss: 158
terrain-cliff-dire-scorch: 158
terrain-cliff-rubble: 253
terrain-cliff-cracks: 234
terrain-cliff-fences: 254
terrain-cliff-fence-rails: 254
terrain-cliff-fence-posts: 508
terrain-cliff-fence-stone-bases: 508
terrain-highground-edges: 316
terrain-ramp-stairs: 18
terrain-landmark-rings: 17
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v4-map-terrain-realism.png
```

V4 river runtime-motion evidence:

```text
Playwright @ http://127.0.0.1:5199/?mode=play&renderer=3d
Runtime layers:
terrain-river-current: 9
terrain-river-bank-mud: 250
terrain-river-reeds: 275
terrain-river-stones: 273
terrain-river-foam-glints: 189
Motion contracts:
terrain-river-current.motion: flow
terrain-river-foam-glints.motion: foam-pulse
terrain-river-reeds.motion: reed-sway
Before:
current strip x/z: 2741.364 / 3042.164
foam opacity: 0.301
reed rotation z: -0.014
After:
current strip x/z: 2683.075 / 2983.875
foam opacity: 0.466
reed rotation z: -0.025
Canvas count: 2
Page errors: none
Screenshot: docs/screenshots/ux-3d-v4-map-river-motion-polish.png
```

```text
Additional V4 terrain screenshots:
docs/screenshots/ux-3d-v4-map-treewall-closeup.png
docs/screenshots/ux-3d-v4-map-treewall-biome-radiant.png
docs/screenshots/ux-3d-v4-map-treewall-biome-dire.png
docs/screenshots/ux-3d-v4-map-river-bank-polish.png
docs/screenshots/ux-3d-v4-map-river-motion-polish.png
docs/screenshots/ux-3d-v4-map-ground-decals-polish.png
docs/screenshots/ux-3d-v4-map-sky-fog-polish.png
docs/screenshots/ux-3d-v4-map-fence-blocker-polish.png
docs/screenshots/ux-3d-v4-map-highground-ramp.png
docs/screenshots/ux-3d-v4-map-cliff-face-rocky.png
docs/screenshots/ux-3d-v4-map-cliff-biome-polish.png
docs/screenshots/ux-3d-v4-map-cliff-biome-dire-polish.png
```

## Merge Notes

- Main collision risk: `src/main.ts`.
- Dependency collision risk remains `package.json` / `package-lock.json` from the shared Three.js dependency.
- `src/sim/unit.ts` has intentional queued-order control plumbing. Review it with `src/engine/input.ts`, `tests/queuedOrders.test.ts`, and `tests/commandMode.test.ts`.
- 3D FX runtime is now active in normal `renderer=3d` play mode through `src/render3d/fx3d.ts`.
- V4 map terrain runtime layers are active in normal `renderer=3d` play mode through `src/render3d/terrain3d.ts`.
- V5 first-read hero metadata is active in `?mode=hero3d-preview` and available for future GLB/PBR mapping through `src/render/hero3dAssets.ts`.
- V5 lane-unit role/faction metadata is active in `?mode=resource3d-preview` and available for future creep GLB/PBR mapping through `src/render/resource3dAssets.ts`.
- V5 neutral/boss and summon/ward metadata is active in `?mode=resource3d-preview` and available for future GLB/PBR mapping through `src/render/resource3dAssets.ts`.
- V7 resource integration metadata is active in `?mode=resource3d-preview` through `window.__resource3dPreview.integration`; consume `placement`, `lod`, and `production` from `src/render/resource3dAssets.ts` before replacing procedural samples with authored assets.
- V8 generated resource roots now expose `root.userData.runtimeIntegration`, `resource3d:v8-footprint:*`, and `resource3d:v8-lod-anchor:*`; use these as the next bridge into map/pathing collision and runtime LOD work.
- V9 VFX/audio contracts are active in `?mode=resource3d-preview` through `window.__resource3dPreview.vfxAudio` and generated roots expose `root.userData.runtimeVfxAudio` plus `resource3d:v9-vfx-audio-sync:*`; use these as the bridge into particle atlas/audio mixer/timeline work.
- V10 visible VFX playback layers are active in `?mode=resource3d-preview` through `window.__resource3dPreview.activeRuntime` and generated roots expose `root.userData.runtimeVfxPlayback`, `resource3d:v10-vfx-playback:*`, `resource3d:v10-vfx-layer:*`, `resource3d:v10-vfx-light:*`, and `resource3d:v10-vfx-decal:*`; use these as the bridge into real particle atlas/timeline/light/decal playback.
- V11 phase animation is active in `?mode=resource3d-preview` through `updateResourceVfxPlayback(root, elapsedMs)` and `window.__resource3dPreview.activeRuntime.vfxPlaybackAnimated`; replace its procedural opacity/scale updates with production particle/audio timeline playback when the real asset stack lands.
- V12 runtime motion is active in `?mode=resource3d-preview` through `updateResourceRuntimeMotion(root, elapsedMs)` and `window.__resource3dPreview.activeRuntime.runtimeMotionAnimated`; replace its procedural root/part transforms with authored animation clips, material animation, and production asset motion when the real `tree3d.js` asset stack lands.
- V13 runtime surface animation is active in `?mode=resource3d-preview` through `updateResourceRuntimeSurface(root, elapsedMs)` and `window.__resource3dPreview.activeRuntime.runtimeSurfaceAnimated`; replace its procedural emissive/roughness/opacity/rim updates with production shader graphs, texture atlas animation, and material animation clips when the real `tree3d.js` asset stack lands.
- Screenshots are intentional evidence under `docs/screenshots/`.
