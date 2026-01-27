# Changelog

All notable changes to RogueHeroes will be documented in this file.

## [Alpha 1.1] - 2026-01-26 (8 hours total)

### New Units

#### Archer
- Ranged unit with 5-tile attack range
- Arrow projectile system with proper spawn positioning from bow
- Vertical attack animations (bow aiming up/down)
- Diagonal attack rotation for angled shots
- Arrow timing synced with bow release animation (750ms)

#### Armored Axeman
- Heavy melee unit with high HP (70), attack (18), and defense (6)
- 9-frame attack animation
- Last strike initiative (slow but devastating)
- Vertical attacks use 25-degree in-game rotation

#### Knight
- Balanced armored melee unit with sword and shield
- HP: 60, Attack: 14, Defense: 5
- Regular initiative
- Vertical attacks use 25-degree in-game rotation

#### Lancer (Mounted Cavalry)
- **Size 2**: Occupies 2 horizontal tiles (horse + rider)
- **Move Speed 2**: Moves 2 tiles per turn in straight lines only
- **Attack Range 2**: Lance reach
- **Charge Attack**: First attack after moving deals 1.2x base damage with no delay
- No rotation for vertical attacks, slight rotation (max 25 degrees) for diagonal attacks
- First strike initiative

### Multi-Tile Unit System
- Units can now have size > 1 (width in tiles)
- Collision detection accounts for all tiles a unit occupies
- Distance calculations measure from nearest edges of units
- Sprite positioning centers across occupied tiles
- Path checking prevents units from passing through each other

### Vampire Lifesteal
- Vampires now heal 20% of damage dealt
- Healing capped at max HP

### Pathfinding Improvements
- Units prioritize moves that get closer to target
- Lateral moves (same distance) used when forward blocked
- Backwards moves only happen 20% of the time when completely blocked
- Archer targeting uses proper distance calculation (targets closest enemy, not top of board)

### Bug Fixes
- Fixed vampire/skeleton sprite positioning (originY: 0.91 for 32x32 sprites)
- Fixed multi-tile units walking through each other
- Fixed lancer charge attack timing (attack after movement animation completes)

### Code Architecture Refactoring
- **CombatScene.ts reduced from 1834 lines to 1193 lines** (35% reduction)
- Extracted `GridUtils.ts` - pure utility functions for collision detection and positioning
- Extracted `AnimationSystem.ts` - handles sprite loading and animation creation
- Added `SpriteConfig` to `UnitStats.ts` - centralized sprite configuration (frameSize, scale, originY, animation frame counts)
- Removed hardcoded switch statements for sprite properties

### Overworld - HOMM3-Style Mouse Movement
- Click once to show path preview, click again to move hero along path
- A* pathfinding with 8 directions (including diagonals, cost 1.41)
- HOMM3-style path visualization with green arrow sprites and X destination marker
- Arrow sprites rotated/flipped from base assets for all 8 directions
- Smooth animated movement along calculated path (150ms per tile)
- Escape key to cancel pending path

### Overworld - Hero Sprites
- HOMM3 mounted knight hero with 8 directional sprite sheets
- 8-frame walking animation per direction (768x68 per sheet)
- Directional animation plays during movement based on travel direction
- Bottom-center sprite anchoring for stable animation (hooves stay fixed)
- Hero scaled to 50% to fit tile size

### Overworld - Tile Walkability System
- Bridge tiles (decoration 109/110) override water terrain blocking
- Black tower entrance (decoration 189) now walkable
- Black house entrance (decoration 242) now walkable
- Sanctuary entrance (terrain 186) now walkable
- Debug mode (D key) shows blocked tiles with red overlay

### Overworld - Fog of War
- Smooth circular gradients at sub-tile resolution (4x4 pixel cells)
- Hero vision radius: 4 tiles with soft 1.5-tile edge fade
- Town vision radius: 5 tiles
- Explored areas retain circular gradient pattern when out of vision
- Brown-tinted fog colors (softer than pure black)
- Minimap shows fog state with matching gradients

### Architecture Refactoring
- Extracted `Pathfinding.ts` utility with A* algorithm (reusable for AI)
- Extracted `FogOfWar.ts` system (visibility calculations and rendering)
- Extracted `Minimap.ts` system (external canvas rendering)
- Extracted `Hero.ts` entity (sprite, animations, movement)
- Created `tiles.ts` with named tile constants (replaces magic numbers)
- Simplified `mapEditor.ts` to use tile constants
- Reduced OverworldScene.ts from 1259 to 625 lines (-50%)
- Added index.ts files for clean imports (`../systems`, `../utils`, `../entities`)
- Updated SKILL.md with new architecture documentation

---

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
