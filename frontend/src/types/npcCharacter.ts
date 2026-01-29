/**
 * NPC Character Sheet System
 * --------------------------
 * Comprehensive character definitions for AI-powered NPCs.
 * Controls personality, emotions, relationships, and quest hooks.
 */

// =============================================================================
// PERSONALITY TRAITS (0-100 scale)
// =============================================================================

/** Core personality traits that define how an NPC behaves */
export interface PersonalityTraits {
  // Emotional disposition
  happiness: number;        // 0=depressed, 50=neutral, 100=joyful
  anger: number;            // 0=calm, 50=irritable, 100=rageful
  fear: number;             // 0=fearless, 50=cautious, 100=paranoid

  // Social traits
  friendliness: number;     // 0=hostile, 50=neutral, 100=warm
  trust: number;            // 0=suspicious, 50=guarded, 100=trusting
  romanticism: number;      // 0=uninterested, 50=open, 100=flirtatious

  // Demeanor
  humor: number;            // 0=deadly serious, 50=balanced, 100=comedic
  formality: number;        // 0=crude/casual, 50=normal, 100=formal/proper

  // Intelligence & wisdom
  intelligence: number;     // 0=simple-minded, 50=average, 100=genius
  wisdom: number;           // 0=naive, 50=experienced, 100=sage-like
  wit: number;              // 0=slow, 50=normal, 100=quick/sharp
  curiosity: number;        // 0=disinterested, 50=normal, 100=endlessly curious

  // Moral compass
  morality: number;         // 0=evil, 50=neutral, 100=saintly
  lawfulness: number;       // 0=chaotic, 50=neutral, 100=lawful
  honesty: number;          // 0=deceptive, 50=selective, 100=brutally honest

  // Temperament
  patience: number;         // 0=explosive, 50=normal, 100=endlessly patient
  courage: number;          // 0=cowardly, 50=normal, 100=recklessly brave
  stubbornness: number;     // 0=pushover, 50=flexible, 100=immovable
  vengefulness: number;     // 0=forgiving, 50=remembers, 100=vindictive

  // Worldview
  religiosity: number;      // 0=atheist, 50=spiritual, 100=zealot
  superstition: number;     // 0=skeptic, 50=open, 100=believes everything
  optimism: number;         // 0=pessimist, 50=realist, 100=optimist

  // Expression style
  verbosity: number;        // 0=terse, 50=normal, 100=rambling
  expressiveness: number;   // 0=stoic, 50=normal, 100=dramatic
  poeticness: number;       // 0=blunt/plain, 50=normal, 100=flowery/artistic
}

// =============================================================================
// PHYSICAL ATTRIBUTES
// =============================================================================

export interface PhysicalAttributes {
  age: 'child' | 'young' | 'adult' | 'middle-aged' | 'elderly' | 'ancient';
  build: 'frail' | 'thin' | 'average' | 'stocky' | 'muscular' | 'obese';
  height: 'tiny' | 'short' | 'average' | 'tall' | 'towering';
  health: 'sickly' | 'weak' | 'healthy' | 'robust' | 'peak';

  // Physical conditions that affect interaction
  disabilities?: string[];   // e.g., "blind", "deaf", "missing arm", "limp"
  distinctiveFeatures?: string[];  // e.g., "scar across face", "one eye", "tattoos"
}

// =============================================================================
// BACKGROUND & HISTORY
// =============================================================================

export interface Background {
  // Core identity
  name: string;
  title?: string;           // e.g., "the Grey", "Captain", "Sister"
  occupation: string;       // Current job/role
  origin: string;           // Where they're from

  // Life story
  backstory: string;        // Detailed history (AI reads this)
  secrets: string[];        // Things they hide (revealed at high trust)
  regrets: string[];        // Past mistakes that haunt them
  proudMoments: string[];   // Achievements they boast about

  // Trauma & emotional baggage
  traumas?: Trauma[];

  // Relationships
  family: string;           // Family situation
  enemies: string[];        // Who they hate/fear
  allies: string[];         // Who they trust/love
}

export interface Trauma {
  event: string;            // What happened
  trigger: string[];        // Words/topics that trigger bad reactions
  reaction: 'withdraw' | 'anger' | 'tears' | 'panic' | 'violence';
  severity: 'mild' | 'moderate' | 'severe';
}

// =============================================================================
// KNOWLEDGE & INFORMATION
// =============================================================================

export interface Knowledge {
  // What they know about
  expertise: string[];      // Topics they know deeply
  rumors: Rumor[];          // Gossip they can share
  secrets: Secret[];        // Hidden info, requires trust to share

  // How freely they share
  informationOpenness: number;  // 0=secretive, 100=tells everything
  priceForInfo?: 'free' | 'gold' | 'favor' | 'trade';
}

export interface Rumor {
  content: string;
  truthfulness: number;     // 0=false, 100=completely true
  importance: 'trivial' | 'minor' | 'significant' | 'major';
}

export interface Secret {
  content: string;
  trustRequired: number;    // 0-100, relationship level needed
  dangerLevel: 'safe' | 'sensitive' | 'dangerous' | 'deadly';
}

// =============================================================================
// RELATIONSHIP SYSTEM
// =============================================================================

export interface RelationshipState {
  // Core metrics (0-100)
  trust: number;            // How much they trust the player
  respect: number;          // How much they respect the player
  affection: number;        // How much they like the player
  fear: number;             // How much they fear the player

  // Status
  status: RelationshipStatus;

  // History
  positiveInteractions: number;
  negativeInteractions: number;
  memorableEvents: MemorableEvent[];

  // Thresholds for special states
  pointOfNoReturn: boolean;    // True = will never forgive
  romanticInterest: boolean;   // True = romantic options available
  vendetta: boolean;           // True = actively working against player
}

export type RelationshipStatus =
  | 'stranger'          // Never met
  | 'acquaintance'      // Met briefly
  | 'friendly'          // On good terms
  | 'friend'            // Genuine friendship
  | 'close_friend'      // Deep bond
  | 'romantic'          // Love interest
  | 'disliked'          // They don't like you
  | 'enemy'             // Active hostility
  | 'nemesis'           // Point of no return, vendetta
  | 'banned';           // Won't interact at all

export interface MemorableEvent {
  description: string;
  impact: number;         // -100 to +100
  timestamp: string;
  forgiven: boolean;
}

// =============================================================================
// BEHAVIORAL RULES
// =============================================================================

export interface BehavioralRules {
  // What makes them angry (topics/actions)
  angerTriggers: string[];

  // What makes them happy
  pleaseTriggers: string[];

  // Topics they refuse to discuss
  forbiddenTopics: string[];

  // Insults that cause major offense
  majorInsults: string[];

  // Actions they might take when upset
  hostileActions: HostileAction[];

  // Conditions for point of no return
  dealbreakers: string[];
}

export interface HostileAction {
  trigger: string;         // What causes this
  action: string;          // What they do
  consequence: Consequence;
}

export interface Consequence {
  type: 'kick_out' | 'refuse_service' | 'attack' | 'call_guards' | 'spread_rumors' | 'steal' | 'curse';
  duration: 'temporary' | 'permanent';
  description: string;
}

// =============================================================================
// QUEST SYSTEM
// =============================================================================

export interface QuestHooks {
  // Quests this NPC can give
  availableQuests: Quest[];

  // How they push the player toward quests
  questStyle: 'direct' | 'subtle_hints' | 'desperate_plea' | 'manipulation' | 'reward_focused';

  // Requirements to unlock quests
  trustRequired: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;      // What NPC tells player
  hiddenDetails: string;    // What NPC doesn't reveal

  // Requirements
  trustRequired: number;
  prerequisites: string[];

  // Hooks - how NPC brings it up
  introductionLines: string[];
  reminderLines: string[];

  // Rewards
  rewards: {
    gold?: number;
    items?: string[];
    relationshipBoost?: number;
    unlocks?: string[];
  };
}

// =============================================================================
// COMPLETE NPC CHARACTER
// =============================================================================

export interface NpcCharacter {
  // Identity
  id: string;
  background: Background;
  physical: PhysicalAttributes;

  // Personality
  personality: PersonalityTraits;

  // What they know
  knowledge: Knowledge;

  // How they behave
  behavior: BehavioralRules;

  // Quest content
  quests: QuestHooks;

  // Current state (mutable)
  relationship: RelationshipState;
  currentMood: number;      // Temporary modifier to happiness

  // Dialogue style
  speechPatterns: {
    greeting: string[];
    farewell: string[];
    filler: string[];       // e.g., "dear", "hmm", "by the gods"
    accent?: string;        // Description of how they talk
  };

  // Location
  location: string;
  schedule?: {              // Where they are at different times
    morning?: string;
    afternoon?: string;
    evening?: string;
    night?: string;
  };

  // Visual
  portrait?: string;
  description: string;      // How they appear in the room
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_PERSONALITY: PersonalityTraits = {
  happiness: 50,
  anger: 20,
  fear: 30,
  friendliness: 50,
  trust: 40,
  romanticism: 20,
  humor: 50,
  formality: 50,
  intelligence: 50,
  wisdom: 50,
  wit: 50,
  curiosity: 50,
  morality: 50,
  lawfulness: 50,
  honesty: 50,
  patience: 50,
  courage: 50,
  stubbornness: 50,
  vengefulness: 30,
  religiosity: 30,
  superstition: 30,
  optimism: 50,
  verbosity: 50,
  expressiveness: 50,
  poeticness: 30,
};

export const DEFAULT_RELATIONSHIP: RelationshipState = {
  trust: 20,
  respect: 30,
  affection: 20,
  fear: 0,
  status: 'stranger',
  positiveInteractions: 0,
  negativeInteractions: 0,
  memorableEvents: [],
  pointOfNoReturn: false,
  romanticInterest: false,
  vendetta: false,
};
