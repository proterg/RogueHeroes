"""
Shared Constants
----------------
Constants shared between frontend and backend.
These values should be kept in sync with the frontend TypeScript types.
"""

# Grid dimensions
GRID_WIDTH = 8
GRID_HEIGHT = 10
TILE_SIZE = 64

# Deployment zones
PLAYER_ZONE_MAX_Y = 3  # Player can deploy in rows 0-2
ENEMY_ZONE_MIN_Y = 7   # Enemies deploy in rows 7-9

# Combat settings
TICK_DURATION_MS = 500  # Duration of each combat tick
MAX_COMBAT_TICKS = 1000  # Maximum ticks before draw

# Unit stats ranges
MIN_HP = 10
MAX_HP = 500
MIN_ATTACK = 1
MAX_ATTACK = 100
MIN_DEFENSE = 0
MAX_DEFENSE = 50
MIN_SPEED = 0.5
MAX_SPEED = 3.0

# Attack ranges by unit type
ATTACK_RANGES = {
    "warrior": 1.5,
    "knight": 1.5,
    "archer": 5.0,
    "mage": 4.0,
    "healer": 3.0,
}

# Unit type colors (for rendering)
UNIT_COLORS = {
    "warrior": 0xE94560,
    "archer": 0x4CAF50,
    "mage": 0x2196F3,
    "knight": 0xFF9800,
    "healer": 0x9C27B0,
}
