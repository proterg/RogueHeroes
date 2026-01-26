# Changelog

All notable changes to RogueHeroes will be documented in this file.

## [Alpha 1.0] - 2026-01-26 (4 hours)

### Combat System
- Implemented 16x9 grid-based autobattler combat scene
- Turn-based combat with initiative tiers (first strike > regular > last strike)
- Units with the same initiative now attack simultaneously
- Fog of war system with unit vision ranges
- Chebyshev distance for movement and attack range calculations

### Directional Attack Animations
- Added vertical attack animations for Orc (attack_up, attack_down)
- Added vertical attack animations for Soldier (attack_up, attack_down)
- Horizontal attacks use sprite flipX for left/right facing
- Vertical attacks use dedicated rotated sprite sheets
- Attack animations show weapon swinging toward the target tile

### Health Visualization
- Replaced health bars with health-based sprite tinting
- Above 75% HP: Normal color
- 50-75% HP: Yellow tint (gradual)
- Below 50% HP: Red tint (gradual)
- Dead units: Gray tint

### Sprite Depth System
- Implemented Y-based depth sorting
- Lower rows (higher Y) render on top of upper rows
- Creates natural layering when units overlap vertically

### Animation Improvements
- Hurt animations no longer interrupt attack animations
- Damage flash properly restores health tint after flashing
- Async-safe animation system for simultaneous combat

### Unit Types
- Orc: Heavy melee fighter with 6-frame attack animation
- Soldier: Balanced melee fighter with sword attack
- Skeleton Warrior: Fast melee with first strike
- Skeleton Guard: Tanky melee unit
- Vampire: Ranged attacker

### Assets
- Organized sprite sheets in frontend/public/assets/units/
- Each unit has: idle, attack, death, move, hurt animations
- Orc and Soldier have additional attack_up and attack_down variants
