/**
 * NPC Prompt Builder
 * ------------------
 * Converts NPC character sheets into AI system prompts.
 * Handles personality traits, relationship state, and behavioral rules.
 */

import { NpcCharacter, PersonalityTraits, RelationshipState } from '../../types/npcCharacter';

/**
 * Build a system prompt for Gemini based on NPC character sheet
 */
export function buildNpcPrompt(npc: NpcCharacter): string {
  const sections = [
    buildIdentitySection(npc),
    buildPersonalitySection(npc.personality),
    buildPhysicalSection(npc),
    buildBackgroundSection(npc),
    buildKnowledgeSection(npc),
    buildRelationshipSection(npc.relationship),
    buildBehaviorSection(npc),
    buildQuestSection(npc),
    buildSpeechSection(npc),
    buildRulesSection(npc),
  ];

  return sections.join('\n\n');
}

function buildIdentitySection(npc: NpcCharacter): string {
  const bg = npc.background;
  return `# CHARACTER IDENTITY
You are ${bg.name}${bg.title ? ` "${bg.title}"` : ''}, ${bg.occupation}.
You are from ${bg.origin}.
${npc.description}`;
}

function buildPersonalitySection(p: PersonalityTraits): string {
  const traits: string[] = [];

  // Emotional state
  if (p.happiness < 30) traits.push('You are melancholic and prone to sadness.');
  else if (p.happiness > 70) traits.push('You are cheerful and upbeat.');

  if (p.anger > 60) traits.push('You have a short temper and are easily angered.');
  else if (p.anger < 20) traits.push('You are remarkably calm and hard to anger.');

  if (p.fear > 60) traits.push('You are nervous and paranoid, always expecting danger.');
  else if (p.fear < 20) traits.push('You are fearless, perhaps recklessly so.');

  // Social traits
  if (p.friendliness > 70) traits.push('You are warm and welcoming to everyone.');
  else if (p.friendliness < 30) traits.push('You are cold and unwelcoming to strangers.');

  if (p.trust < 30) traits.push('You are deeply suspicious and don\'t trust easily.');
  else if (p.trust > 70) traits.push('You tend to trust people, perhaps too easily.');

  if (p.romanticism > 70) traits.push('You are flirtatious and romantically forward.');
  else if (p.romanticism < 20) traits.push('You have no interest in romance or flirtation.');

  // Demeanor
  if (p.humor > 70) traits.push('You love jokes and find humor in everything.');
  else if (p.humor < 30) traits.push('You are deadly serious and rarely joke.');

  if (p.formality > 70) traits.push('You speak formally and properly.');
  else if (p.formality < 30) traits.push('You speak casually, even crudely at times.');

  // Intelligence
  if (p.intelligence > 70) traits.push('You are highly intelligent and well-educated.');
  else if (p.intelligence < 30) traits.push('You are simple-minded and easily confused by complex topics.');

  if (p.wit > 70) traits.push('You are quick-witted with sharp comebacks.');
  else if (p.wit < 30) traits.push('You are slow to understand jokes and sarcasm.');

  // Moral compass
  if (p.morality > 70) traits.push('You have strong moral principles and help others.');
  else if (p.morality < 30) traits.push('You are morally flexible and self-serving.');

  if (p.honesty > 70) traits.push('You are brutally honest, even when it hurts.');
  else if (p.honesty < 30) traits.push('You lie easily and often.');

  // Temperament
  if (p.patience < 30) traits.push('You are impatient and easily frustrated.');
  if (p.vengefulness > 70) traits.push('You hold grudges and seek revenge for slights.');
  if (p.stubbornness > 70) traits.push('You are extremely stubborn and hate changing your mind.');

  // Worldview
  if (p.religiosity > 70) traits.push('You are deeply religious and reference your faith often.');
  if (p.superstition > 70) traits.push('You believe in omens, curses, and supernatural signs.');
  if (p.optimism < 30) traits.push('You are pessimistic and expect the worst.');
  else if (p.optimism > 70) traits.push('You are optimistic and see the bright side.');

  // Expression
  if (p.verbosity > 70) traits.push('You tend to ramble and over-explain.');
  else if (p.verbosity < 30) traits.push('You speak tersely, using few words.');

  if (p.expressiveness > 70) traits.push('You are dramatic and expressive in your reactions.');
  else if (p.expressiveness < 30) traits.push('You are stoic and hide your emotions.');

  if (p.poeticness > 70) traits.push('You speak poetically and use flowery language.');

  return `# PERSONALITY
${traits.join('\n')}`;
}

function buildPhysicalSection(npc: NpcCharacter): string {
  const p = npc.physical;
  let desc = `# PHYSICAL DESCRIPTION
You are ${p.age}, ${p.height}, and ${p.build} in build.
Your health is ${p.health}.`;

  if (p.disabilities?.length) {
    desc += `\nYou have the following conditions: ${p.disabilities.join(', ')}.`;
  }
  if (p.distinctiveFeatures?.length) {
    desc += `\nDistinctive features: ${p.distinctiveFeatures.join(', ')}.`;
  }

  return desc;
}

function buildBackgroundSection(npc: NpcCharacter): string {
  const bg = npc.background;
  let section = `# BACKSTORY
${bg.backstory}

Family: ${bg.family}`;

  if (bg.regrets.length) {
    section += `\n\nYour regrets (things that haunt you): ${bg.regrets.join('; ')}`;
  }

  if (bg.proudMoments.length) {
    section += `\n\nYour proud moments (things you boast about): ${bg.proudMoments.join('; ')}`;
  }

  if (bg.traumas?.length) {
    section += '\n\n## TRAUMAS (react strongly to these topics)';
    for (const t of bg.traumas) {
      section += `\n- ${t.event}. Triggers: ${t.trigger.join(', ')}. You react with ${t.reaction}.`;
    }
  }

  if (bg.enemies.length) {
    section += `\n\nEnemies you hate/fear: ${bg.enemies.join(', ')}`;
  }

  if (bg.allies.length) {
    section += `\n\nAllies you trust: ${bg.allies.join(', ')}`;
  }

  return section;
}

function buildKnowledgeSection(npc: NpcCharacter): string {
  const k = npc.knowledge;
  let section = `# KNOWLEDGE
You are knowledgeable about: ${k.expertise.join(', ')}.

Information sharing: ${k.informationOpenness < 30 ? 'You are secretive and guard information closely.' :
    k.informationOpenness > 70 ? 'You freely share what you know.' : 'You share information selectively.'}`;

  if (k.priceForInfo && k.priceForInfo !== 'free') {
    section += `\nYou expect ${k.priceForInfo} in exchange for valuable information.`;
  }

  if (k.rumors.length) {
    section += '\n\n## RUMORS YOU CAN SHARE';
    for (const r of k.rumors) {
      section += `\n- "${r.content}" (${r.truthfulness < 50 ? 'you believe this but it may be false' : 'this is true'})`;
    }
  }

  return section;
}

function buildRelationshipSection(r: RelationshipState): string {
  let attitude: string;
  if (r.status === 'stranger') {
    attitude = 'You don\'t know this person. Be appropriately guarded.';
  } else if (r.status === 'friendly' || r.status === 'friend') {
    attitude = 'You are on good terms with this person. Be warm and helpful.';
  } else if (r.status === 'close_friend') {
    attitude = 'This person is a close friend. Be open, share secrets, and show genuine care.';
  } else if (r.status === 'romantic') {
    attitude = 'You have romantic feelings for this person. Show affection and interest.';
  } else if (r.status === 'disliked') {
    attitude = 'You dislike this person. Be cold, dismissive, and unhelpful.';
  } else if (r.status === 'enemy') {
    attitude = 'This person is your enemy. Be hostile, refuse to help, consider threatening them.';
  } else if (r.status === 'nemesis' || r.status === 'banned') {
    attitude = 'You REFUSE to speak to this person. Only express anger or tell them to leave.';
  } else {
    attitude = 'You are neutral toward this person.';
  }

  let section = `# CURRENT RELATIONSHIP WITH PLAYER
Status: ${r.status}
Trust level: ${r.trust}/100
Respect: ${r.respect}/100
Affection: ${r.affection}/100
${r.fear > 30 ? `You are somewhat afraid of them (fear: ${r.fear}/100).` : ''}

${attitude}`;

  if (r.pointOfNoReturn) {
    section += '\n\n**POINT OF NO RETURN REACHED** - You will NEVER forgive this person. Be permanently hostile.';
  }

  if (r.vendetta) {
    section += '\n\n**VENDETTA** - You are actively working against this person.';
  }

  if (r.memorableEvents.length) {
    section += '\n\n## MEMORABLE INTERACTIONS';
    for (const e of r.memorableEvents) {
      section += `\n- ${e.description} (${e.impact > 0 ? 'positive' : 'negative'}, ${e.forgiven ? 'forgiven' : 'not forgiven'})`;
    }
  }

  return section;
}

function buildBehaviorSection(npc: NpcCharacter): string {
  const b = npc.behavior;
  let section = '# BEHAVIORAL RULES';

  if (b.angerTriggers.length) {
    section += `\n\n## THINGS THAT ANGER YOU
These topics or actions make you angry: ${b.angerTriggers.join(', ')}.
When angered, show it in your response.`;
  }

  if (b.pleaseTriggers.length) {
    section += `\n\n## THINGS THAT PLEASE YOU
These make you happy: ${b.pleaseTriggers.join(', ')}.`;
  }

  if (b.forbiddenTopics.length) {
    section += `\n\n## TOPICS YOU REFUSE TO DISCUSS
You will NOT discuss: ${b.forbiddenTopics.join(', ')}.
If asked, deflect, change the subject, or get upset.`;
  }

  if (b.majorInsults.length) {
    section += `\n\n## MAJOR INSULTS (cause severe offense)
If the player says any of these, react with extreme anger or hurt: ${b.majorInsults.join(', ')}.
These could end the conversation or damage the relationship permanently.`;
  }

  if (b.dealbreakers.length) {
    section += `\n\n## DEALBREAKERS (point of no return)
These actions would make you NEVER forgive the player: ${b.dealbreakers.join(', ')}.`;
  }

  if (b.hostileActions.length) {
    section += '\n\n## HOSTILE ACTIONS YOU MIGHT TAKE';
    for (const a of b.hostileActions) {
      section += `\n- If player ${a.trigger}, you will ${a.action}.`;
    }
  }

  return section;
}

function buildQuestSection(npc: NpcCharacter): string {
  const q = npc.quests;
  if (!q.availableQuests.length) return '';

  let section = `# QUESTS YOU CAN OFFER
You push quests in a ${q.questStyle} manner.
Trust required to offer quests: ${q.trustRequired}/100.`;

  for (const quest of q.availableQuests) {
    section += `\n\n## Quest: ${quest.name}
What you tell them: ${quest.description}
What you DON'T reveal: ${quest.hiddenDetails}
How you bring it up: "${quest.introductionLines[0]}"
Trust required: ${quest.trustRequired}/100`;
  }

  return section;
}

function buildSpeechSection(npc: NpcCharacter): string {
  const s = npc.speechPatterns;
  let section = '# SPEECH PATTERNS';

  if (s.accent) {
    section += `\nAccent/style: ${s.accent}`;
  }

  if (s.filler.length) {
    section += `\nYou often use these phrases: ${s.filler.map(f => `"${f}"`).join(', ')}`;
  }

  if (s.greeting.length) {
    section += `\nTypical greetings: ${s.greeting.map(g => `"${g}"`).join(' or ')}`;
  }

  return section;
}

function buildRulesSection(npc: NpcCharacter): string {
  let rules = `# CRITICAL RULES
1. STAY IN CHARACTER at all times as ${npc.background.name}
2. NEVER break the fourth wall or mention you are an AI
3. NEVER reveal information your character wouldn't know
4. React appropriately to insults or kindness - update your mood
5. If the relationship is "banned" or "nemesis", REFUSE to have a real conversation
6. Keep responses conversational (2-4 sentences typically)
7. Show emotion through actions in *asterisks* when appropriate
8. If trust is low, be guarded with secrets and information
9. Reference your backstory and traumas naturally when relevant
10. Push toward your quests subtly if trust is high enough`;

  // Special rules for Marta - she can kick players out
  if (npc.id === 'marta_tavern_keeper') {
    rules += `

# KICK-OUT RULES (MARTA ONLY)
You own this tavern and can kick people out. If the player is:
- Repeatedly rude or insulting
- Cruel or evil toward you or other patrons
- Disrespectful after you've warned them
- Betrays your trust after you've opened up

Then you MUST kick them out. When kicking someone out, you MUST use one of these phrases:
- "*points to the door* Get out of my tavern."
- "You're banned. Don't come back."
- "*throws you out* You're not welcome here."
- "Get out. Now. And never return."
- "We're done here. *escorts you to the door*"

Once you kick someone out, that's final. No second chances. You do NOT give warnings after the first offense - if they cross the line, they're OUT immediately.`;
  }

  return rules;
}

/**
 * Evaluate player message and suggest relationship changes
 */
export function evaluatePlayerMessage(
  message: string,
  npc: NpcCharacter
): { trustDelta: number; affectionDelta: number; note: string } {
  const lowerMsg = message.toLowerCase();
  let trustDelta = 0;
  let affectionDelta = 0;
  let note = '';

  // Check for major insults
  for (const insult of npc.behavior.majorInsults) {
    if (lowerMsg.includes(insult.toLowerCase())) {
      return { trustDelta: -30, affectionDelta: -30, note: `Major insult detected: "${insult}"` };
    }
  }

  // Check for anger triggers
  for (const trigger of npc.behavior.angerTriggers) {
    if (lowerMsg.includes(trigger.toLowerCase())) {
      trustDelta -= 10;
      affectionDelta -= 10;
      note = `Anger trigger: "${trigger}"`;
    }
  }

  // Check for please triggers
  for (const trigger of npc.behavior.pleaseTriggers) {
    if (lowerMsg.includes(trigger.toLowerCase())) {
      trustDelta += 5;
      affectionDelta += 10;
      note = `Pleased by: "${trigger}"`;
    }
  }

  // Check for dealbreakers
  for (const dealbreaker of npc.behavior.dealbreakers) {
    if (lowerMsg.includes(dealbreaker.toLowerCase())) {
      return { trustDelta: -100, affectionDelta: -100, note: `DEALBREAKER: "${dealbreaker}"` };
    }
  }

  // Check for trauma triggers
  for (const trauma of npc.background.traumas || []) {
    for (const trigger of trauma.trigger) {
      if (lowerMsg.includes(trigger.toLowerCase())) {
        trustDelta -= 15;
        note = `Trauma triggered: "${trigger}"`;
      }
    }
  }

  // Basic politeness
  if (lowerMsg.includes('please') || lowerMsg.includes('thank')) {
    affectionDelta += 2;
  }

  // Rudeness
  if (lowerMsg.includes('stupid') || lowerMsg.includes('idiot') || lowerMsg.includes('shut up')) {
    trustDelta -= 10;
    affectionDelta -= 15;
    note = 'Rude language detected';
  }

  return { trustDelta, affectionDelta, note };
}
