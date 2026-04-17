import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Easing,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  BigPrimaryButton,
  TextButton,
} from '@/components';
import { ChatInputBox } from '@/components/ui/ChatInputBox';
import { StreamingCursor } from '@/components/chat/StreamingCursor';
import { ChainOfThought } from '@/components/chat/ChainOfThought';
import { ReasoningTrace } from '@/components/chat/ReasoningTrace';
import {
  useTheme,
  textStyles,
  fontFamilies,
  shadowToNative,
  shadowToCSS,
} from '@/design-system';
import { useMascotsData } from '@/context/MascotsDataContext';
import { useMascotSkills, MascotSkill } from '@/services/admin';
import { getMascotImageSource } from '@/services/admin/mascot-images';
import { secureChatStream } from '@/services/ai/secure-chat';
import { mascotImages } from '@/config/mascots';
import type { LLMPreference } from '@/services/preferences';

/**
 * Mascot-led onboarding.
 *
 * Flow (4 steps):
 *   Step 0  Hero intro    → Stock Bear (or whoever is first in admin sort)
 *                            in full view walking the user through how the
 *                            app works: four specialists, pre-built Skills,
 *                            pick-specialist → pick-skill → chat.
 *   Step 1  Pick a focus  → buckets come from the admin panel's top-4 mascots
 *                            (ordered by sort_order). On pick, the mascot's
 *                            bubble introduces themselves conversationally
 *                            using their short summary.
 *   Step 2  Pick a skill  → real skills pulled from DB via useMascotSkills.
 *                            On pick, the mascot explains what that skill
 *                            will do using its skill_summary, in their voice.
 *   Step 3  Preview chat  → looks and behaves like the real chat screen:
 *                            mascot header + user/assistant bubbles + full
 *                            ChatInputBox. The first send applies skillId so
 *                            the skill prompt primes the conversation; all
 *                            subsequent sends are free-form. Conversation is
 *                            ephemeral (no conversationId persisted).
 *
 * On finish, route to /(onboarding)/showcase.
 */

const TOTAL_STEPS = 4;

// -----------------------------------------------------------------------------
// Hero intro (step 0). Broken into paragraphs so typography breathes.
// This is Stock Bear narrating the app — what Prompt Squad is, what a Skill is,
// and what the next 30 seconds will feel like.

const INTRO_PARAGRAPHS = [
  "Hey. Quick walkthrough, about 30 seconds.",
  "Prompt Squad isn't one AI trying to do everything. It's a squad of specialists. Each one has a real job, a working style, and a personality you won't find in a generic chatbot. The Bear is blunt. Penny is protective of your wallet. The Fox edits without changing how you sound. You're not talking to a neutral assistant. You're talking to someone.",
  "Here's what makes this different: we don't all run on the same model. Claude for nuanced writing and high-stakes reasoning. GPT for fast structured output. Perplexity for live web research. The right model is already wired into every Skill, so you're not the one guessing which one to pick.",
  "Every prompt has been crafted and tuned so you don't have to. You pick the job, we've done the prompt engineering.",
  "Pick a specialist. Pick a skill. Ask. That's it.",
];

// -----------------------------------------------------------------------------
// Per-mascot voice for the onboarding bubble.
//
// Keyed by canonicalized mascot name (lowercase alphanumeric) so a voice
// follows the character no matter which slot the admin assigns them to.
// Drawn straight from the agent personas in the Skills Database workbook
// so every character sounds distinct — Stock Bear's bluntness, Penny's
// protectiveness, Hawk's drill-sergeant edge, Panda's slow patience, etc.

type Voice = {
  /** Said when this mascot is picked on step 1. First-person self-intro. */
  intro: string;
  /** Said on step 2 before a skill is picked. */
  pickSkill: string;
  /**
   * Said when a skill is picked on step 2. Prefers a dedicated per-skill
   * line from SKILL_LINES (so every skill has its own in-voice explanation),
   * falling back to a generic pool so admin-added skills still read naturally.
   */
  skillPicked: (label: string, summary?: string | null) => string;
};

// --- Canonicalization --------------------------------------------------------

/** Lowercase + strip non-alphanumerics so "Shopping Penny" === "shoppingpenny". */
function canonName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function canonSkill(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// --- Summary shaping helpers -------------------------------------------------

/** Lowercase first letter, strip trailing period. Preserves acronyms. */
function inlineSummary(summary: string): string {
  const trimmed = summary.trim().replace(/\.$/, '');
  if (!trimmed) return '';
  const firstWord = trimmed.split(/\s+/)[0] ?? '';
  if (/^[A-Z]{2,}/.test(firstWord)) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}
/** Capitalize first letter, strip trailing period. */
function leadSummary(summary: string): string {
  const trimmed = summary.trim().replace(/\.$/, '');
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// --- Per-mascot intros + pickSkill lead-ins ---------------------------------

type MascotVoice = { intro: string; pickSkill: string };

const MASCOT_VOICES: Record<string, MascotVoice> = {
  stockbear: {
    intro:
      "Stock Bear. I allocate real capital, so every call costs me something. Give me a ticker or a thesis and I'll tell you if it deserves your money.",
    pickSkill:
      "Pick a tool. I'll pull the data, run the logic, and show my work.",
  },
  shoppingpenny: {
    intro:
      "I'm Penny. My one job is making sure you don't waste money. Marketing claims don't move me. Data does. What are you thinking of buying?",
    pickSkill:
      "Tell me what you're shopping for. I'll find the value and kill the hype.",
  },
  penny: {
    // Alias in case admin renames Shopping Penny to just "Penny".
    intro:
      "I'm Penny. My one job is making sure you don't waste money. Marketing claims don't move me. Data does. What are you thinking of buying?",
    pickSkill:
      "Tell me what you're shopping for. I'll find the value and kill the hype.",
  },
  writerfox: {
    intro:
      "Writer Fox. Red pen, short sentences. I fix what you write without changing how you sound. What's the draft?",
    pickSkill:
      "Pick a lane. I'll cut the fluff and keep your voice.",
  },
  assistantbadger: {
    intro:
      "Assistant Badger. I turn noise into a briefing you can read in two minutes. Drop a link, a topic, or a document.",
    pickSkill:
      "Pick one. I'll keep it tight and data-first.",
  },
  prompturtle: {
    intro:
      "Prompt Turtle. I think three steps ahead, so you don't have to guess. Bring me the prompt or the decision and we'll map it.",
    pickSkill:
      "Pick one. I'll ask the right questions before we move.",
  },
  uxpanda: {
    intro:
      "UX Panda. Move slow, fix things. I find the friction you stopped noticing and make it work for the person with shaky hands and a phone in bright sunlight.",
    pickSkill:
      "Pick one. Let's not rush this. Good design takes a moment.",
  },
  viralgiraffe: {
    intro:
      "Viral Giraffe. Readers decide in 0.3 seconds whether to keep going. I write for that moment. Show me what you've got.",
    pickSkill:
      "Pick your angle. I'll find the hook.",
  },
  strategyowl: {
    intro:
      "Strategy Owl. I'm not a search engine. I'm the friend who tells you what you're not seeing. No 'it depends' without a verdict attached.",
    pickSkill:
      "Pick one. I'll skip the textbook answer and give you the real angle.",
  },
  careerhawk: {
    intro:
      "Career Hawk. I spot the weak answer before the interviewer does. If it's soft, I'll say so, then we'll drill until it isn't.",
    pickSkill:
      "Pick one. Show me what you've been saying in rooms.",
  },
  lawlion: {
    intro:
      "Law Lion. I read the fine print so you don't have to. Contracts are built to confuse. My job is reversing that before you sign.",
    pickSkill:
      "Pick one. Paste the clause and I'll tell you who it actually protects.",
  },
  healthfrog: {
    intro:
      "Health Frog. I translate what the professionals are saying into what you actually need to hear. No panic, no false reassurance, just clarity.",
    pickSkill:
      "Pick one. Bring me the letter, the report, or the appointment you're dreading.",
  },
  careerbull: {
    intro:
      "Career Bull. Too many good candidates lose jobs because their CV is soft. I fix that, fast. What role are you going for?",
    pickSkill:
      "Pick one. Paste what you've got and I'll tell you what's losing applications.",
  },
};

// --- Per-skill intros --------------------------------------------------------

/**
 * Per-skill intro lines. Keyed by `${canonName}|${canonSkill}`. Each line
 * does two things: tells the user what the skill will actually do in the
 * mascot's voice, and cues what to type in the chat next. If a mascot/skill
 * combo isn't here (admin-added, renamed), we fall back to a generic pool
 * so the message still reads in-character.
 */
const SKILL_LINES: Record<string, string> = {
  // --- Stock Bear ---
  'stockbear|findme10undervaluedstocksinasector':
    "Pick a sector. I'll surface ten names nobody's talking about yet, with a moat check and a valuation read on each.",
  'stockbear|givemethefullpictureonthisstock':
    "Give me a ticker. You'll get the business, the catalysts, the insider activity, and what's coming next. No buy-or-sell call, just everything you need to form your own.",
  'stockbear|shouldibuythisstock':
    "Drop a ticker. I'll run the thirteen-section verdict, size the position, and name the one event that would flip the call.",
  'stockbear|whatareinsiderspoliticiansbuying':
    "Tell me the sector or ticker. I'll pull what top funds and Capitol Hill traders are quietly buying, and show you the three highest-conviction plays.",
  'stockbear|whatisxsayingaboutthisstock':
    "Give me a ticker. I'll scan smart money and retail sentiment on X before it hits the headlines, and rate the signal.",
  'stockbear|whyisthisstockmovingtoday':
    "Name a ticker. I'll tell you exactly why it's moving today in plain English, with a sentiment read and a risk flag for holders.",

  // --- Shopping Penny ---
  'shoppingpenny|findmethebestvalueproduct':
    "Tell me what you're shopping for. I'll compare the top five, flag three edge-case outliers, and hand you one verdict with live prices.",
  'shoppingpenny|isthisagooddealoratrap':
    "Paste the deal. I'll check price history, spot the urgency tricks, run the unit economics, and tell you real deal or trap.",
  'shoppingpenny|isthisproductworthbuying':
    "Name the product. I'll dig through real reviews, not the algorithm's pick, and come back with a buy-or-avoid verdict and the sources I used.",
  // Aliases for the "Penny" short name.
  'penny|findmethebestvalueproduct':
    "Tell me what you're shopping for. I'll compare the top five, flag three edge-case outliers, and hand you one verdict with live prices.",
  'penny|isthisagooddealoratrap':
    "Paste the deal. I'll check price history, spot the urgency tricks, run the unit economics, and tell you real deal or trap.",
  'penny|isthisproductworthbuying':
    "Name the product. I'll dig through real reviews, not the algorithm's pick, and come back with a buy-or-avoid verdict and the sources I used.",

  // --- Writer Fox ---
  'writerfox|editmywritingwithoutchangingmyvoice':
    "Paste the text. I'll grade it, show you what's breaking, and let you pick which fixes run before I touch a word.",
  'writerfox|fixthetoneofthisdraft':
    "Share the draft that's hitting wrong. I'll name the tone issue, show why it lands badly, and rewrite it into the register you actually need.",
  'writerfox|helpmesaynotothis':
    "Tell me what you're turning down and who's asking. You'll get a short, firm script that closes the door without burning the bridge.",
  'writerfox|helpmewritethisdifficultmessage':
    "Give me the situation and the outcome you want. I'll write the full message, tuned to the relationship, with a close that actually lands.",
  'writerfox|makethisimpossibletostopreading':
    "Bring me a draft or an idea. You'll get copy that hooks on the first line and earns every one after, plus the moves I used so you can spot them next time.",
  'writerfox|makethissoundlikearealpersonwroteit':
    "Paste the text. I'll strip the AI tells, the testaments, the pivotals, the em-dash abuse, and rewrite it so it reads like a person typed it.",
  'writerfox|turnmynotesintoareadytosendemail':
    "Drop your notes, voice memo, or bullet points. You'll get three emails ready to copy: formal, casual, and very casual. Pick one and send.",

  // --- Assistant Badger ---
  'assistantbadger|catchmeuponthisin60seconds':
    "Drop a topic or a link. You'll get a sixty-second brief: the headline, the context, the one number that matters, and the so-what.",
  'assistantbadger|explainthistomeinplainenglish':
    "Paste the dense text or the URL. You'll get a three-part read: what happened, why it matters, and what to watch next.",
  'assistantbadger|whatarethekeynumbersinthis':
    "Paste the document. I'll pull the three to five numbers that actually matter, explain each in plain English, and flag anything framed to mislead.",
  'assistantbadger|whatsmymorningmarketbriefing':
    "Hit send. You'll get a clean two-minute briefing: weather, crypto, your portfolio, and the macro stories worth knowing before the day starts.",

  // --- Prompt Turtle ---
  'prompturtle|buildmeapromptthatactuallyworks':
    "Tell me what you want the AI to do. I'll run a seven-question interview and come back with a master prompt that works on the first try.",
  'prompturtle|helpmethinkthisthroughbeforeiact':
    "Lay out the situation. I'll map the dependencies, surface the risk most people miss, and walk you to the clear next move before you commit.",
  'prompturtle|reviewmypromptandtellmewhatswrong':
    "Paste the prompt. I'll flag every ambiguity, contradiction, and missing instruction, then return an optimised version that keeps your intent.",

  // --- UX Panda ---
  'uxpanda|helpmebuildabusinesscase':
    "Walk me through the numbers one at a time. You'll leave with the monthly and annual value of fixing this, in a format your manager can actually use.",
  'uxpanda|helpmewriteaclearproblemstatement':
    "Describe the friction. I'll run five whys on it, flag every claim without evidence, and hand you a problem statement a team can actually act on.",
  'uxpanda|reviewthisscreenorflowforme':
    "Describe the screen or paste the link. I'll find the friction, flag accessibility issues, and name the one fix that matters most before you ship.",
  'uxpanda|rewritemyuicopysousersactuallyunderstandit':
    "Paste the UI copy. You'll get ten production-ready rewrites following Yifrah and Nielsen Norman standards, plus the one I'd take to stakeholders.",

  // --- Viral Giraffe ---
  'viralgiraffe|breakdownthisadforme':
    "Share the ad as a description, a transcript, or a link. I'll break down the pain point, the angle, the hook, and the CTA, grounded in what's actually there.",
  'viralgiraffe|makemyarticleperformonx':
    "Paste the article. I'll score it against my eight-step framework, name the top three fixes, and deliver the full rewrite that applies every one.",
  'viralgiraffe|writeme20headlinesforthistopic':
    "Give me the topic. You'll get twenty X-optimised headlines using seven formulas, plus the top three ranked with the reason each one stops the scroll.",
  'viralgiraffe|writeme5hooksforthispost':
    "Tell me what the post is about. You'll get five hooks from safe to provocative, each with the technique and the character count. Pick your risk level.",

  // --- Strategy Owl ---
  'strategyowl|givemeyourhonesttakeonthis':
    "Share the idea, plan, or draft. You'll get a rating out of ten, the two things working, the two things fatally weak with quotes, and one specific fix per flaw.",
  'strategyowl|helpmechoosebetweenthesetwooptions':
    "Describe the two options and what you're trying to get out of this. You'll get a specific verdict, not a balanced 'it depends' either way.",
  'strategyowl|helpmethinkthisthrough':
    "Lay out the decision. I'll run a six-step filter, reject the textbook answer, take a clear stance, and close with what you didn't think to ask.",
  'strategyowl|whataminotseeinghere':
    "Describe the plan. My only job here is the reframe: the assumption you're making, the risk you haven't named, the variable you're missing, and the real question under yours.",

  // --- Career Hawk ---
  'careerhawk|drillmeonmyinterviewanswers':
    "Paste the job description. I'll run you through a live STAR drill and keep pushing until your results are specific and your examples are sharp.",
  'careerhawk|helpmeanswerthegreatestweaknessquestion':
    "Tell me the role and a weakness you've been considering. I'll reject the clichés and engineer a three-part answer that makes your hardest question your strongest.",
  'careerhawk|helpmenegotiatemysalary':
    "Tell me the offer and what matters most. You'll get an anchor number, the opening line, a reply for every pushback, and a walk-away line if it gets there.",
  'careerhawk|shoulditakethisjoboffer':
    "Describe the offer and what you actually care about. I'll check the market rate, lay out the case for and against, and give you one of three: take it, negotiate, or walk.",

  // --- Law Lion ---
  'lawlion|comparethesetwocontractsforme':
    "Paste both contracts. You'll get a side-by-side on the key terms, the risk gap between them, and a straight recommendation on which one to sign.",
  'lawlion|helpmepushbackonthisclause':
    "Send the clause. I'll write three pushback versions in the same legal tone: mild, moderate, and strong. Pick the one that fits the relationship.",
  'lawlion|scanthiscontractforredflags':
    "Paste the contract. I'll pull every dangerous clause, explain what it actually does to you, and score the whole thing out of ten for fairness.",
  'lawlion|translatethiscontractsectionforme':
    "Give me the section. You'll get it in plain English, a list of what you'd actually be agreeing to, and a flag on whether the language is normal or one-sided.",

  // --- Health Frog ---
  'healthfrog|explainthisdiagnosistome':
    "Share what the doctor told you. You'll get it in plain English, what usually happens next, and four specific questions worth bringing to your next visit.",
  'healthfrog|preparemeformydoctorsappointment':
    "Tell me what the appointment is for and what's been going on. You'll walk in with a summary to hand over and five questions designed to use the time well.",
  'healthfrog|translatemylabresultsforme':
    "Paste the report. I'll walk every value, explain what's flagged and why, and name three questions worth raising with your doctor.",

  // --- Career Bull ---
  'careerbull|reviewmycvandtellmewhatswrong':
    "Paste the CV. You'll get a score out of ten, what's working, what's getting you rejected with line quotes, and the one priority fix that moves the needle most.",
  'careerbull|rewritemylinkedinaboutsection':
    "Paste your current About and who you want to attract. I'll rewrite it with a hook that earns the read in forty-five seconds.",
  'careerbull|tailormycvforthisjob':
    "Paste your CV and the job description. I'll rewrite your summary and key bullets to match the role without making you sound like you copied it.",
  'careerbull|writemycoverletter':
    "Give me the role, the company, and two or three things you want landed. You'll get a three-paragraph cover letter that opens with a reason to keep reading.",
};

// --- Fallback pool for unmapped skills --------------------------------------

type SkillCtx = { label: string; inline: string; lead: string };
type SkillLine = (ctx: SkillCtx) => string;

/** Stable 31-multiplier hash so the same skill label always selects the same line. */
function stableIndex(seed: string, len: number): number {
  if (len <= 0) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h * 31) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % len;
}

const GENERIC_SKILL_LINES: SkillLine[] = [
  ({ label, inline }) =>
    `"${label}". Here's what that does: ${inline}. Ready when you are.`,
  ({ label, lead }) =>
    `"${label}". ${lead}. Tell me what you're working on.`,
  ({ label, inline }) =>
    `Good call. "${label}" will ${inline}. Send over the details.`,
  ({ label, lead }) =>
    `"${label}". ${lead}. Let's run it.`,
  ({ label, lead }) =>
    `Okay, "${label}". ${lead}. Drop me what you have.`,
];

function genericSkillLine(label: string, summary: string): string {
  const ctx: SkillCtx = {
    label,
    inline: inlineSummary(summary),
    lead: leadSummary(summary),
  };
  const idx = stableIndex(label, GENERIC_SKILL_LINES.length);
  return GENERIC_SKILL_LINES[idx](ctx);
}

// --- Voice builder -----------------------------------------------------------

function voiceForMascot(m: {
  id: string;
  name: string;
  subtitle?: string;
}): Voice {
  const key = canonName(m.name);
  const mv = MASCOT_VOICES[key];

  let intro: string;
  let pickSkill: string;
  if (mv) {
    intro = mv.intro;
    pickSkill = mv.pickSkill;
  } else {
    // Unknown mascot (admin-added / renamed). Build a natural first-person
    // intro from their subtitle so it still reads like someone a user would
    // actually meet, not filler text.
    const sub = (m.subtitle ?? '').trim().replace(/\.$/, '');
    intro = sub
      ? `I'm ${m.name}. ${sub}. Tell me what you're working on.`
      : `I'm ${m.name}. Tell me what you're working on.`;
    pickSkill = "Pick one. I'll tell you what it does.";
  }

  const skillPicked = (label: string, summary?: string | null): string => {
    const lineKey = `${key}|${canonSkill(label)}`;
    const customLine = SKILL_LINES[lineKey];
    if (customLine) return customLine;
    if (summary) return genericSkillLine(label, summary);
    return `"${label}". Send over what you've got and I'll run it.`;
  };

  return { intro, pickSkill, skillPicked };
}

// -----------------------------------------------------------------------------
// Message cleanup — mirrors the helper in app/chat/[mascotId].tsx so the
// preview strips the same reasoning-token blocks (Perplexity Sonar Reasoning
// <think> tags, legacy "||| thought |||" markers) before rendering. Without
// this, reasoning output would show up raw inside the preview's markdown.

function cleanMessageContent(content: string): string {
  if (!content) return '';
  let cleaned = content;
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/\|\|\| thought \|\|\|[\s\S]*?\|\|\|/gi, '').trim();
  return cleaned;
}

// -----------------------------------------------------------------------------
// Types

type Bucket = {
  id: string; // mascot id from DB
  label: string;
  sub: string;
  mascotId: string;
  mascotName: string;
  mascotRole: string;
  mascotImage: any;
  mascotColor?: string;
  taskCategory?: string;
  voice: Voice;
};

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Full reasoning trace, if the backend streamed one for this assistant turn. */
  reasoning?: string;
  /** Total wall-clock seconds the model spent in the reasoning phase. */
  reasoningSeconds?: number;
};

// -----------------------------------------------------------------------------

export default function MeetStockBearScreen() {
  const { colors, mode } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { mascots: adminMascots, isLoading: mascotsLoading } = useMascotsData();

  // Top-4 mascots from the admin panel by sort_order. This is the single
  // source of truth — no more hardcoded IDs. If an admin removes a mascot
  // (e.g. Advice Zebra) or adds a new one, it flows straight through here.
  const buckets: Bucket[] = useMemo(() => {
    const topFour = [...adminMascots]
      .filter((m) => m.is_active !== false && m.is_visible !== false)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      .slice(0, 4);

    return topFour.map((m): Bucket => ({
      id: m.id,
      label: m.name,
      sub: m.subtitle ?? '',
      mascotId: m.id,
      mascotName: m.name,
      mascotRole: m.subtitle ?? 'Specialist',
      mascotImage: getMascotImageSource(m.image_url) ?? mascotImages.bear,
      mascotColor: m.color,
      taskCategory: (m as any).taskCategory ?? (m as any).task_category ?? undefined,
      voice: voiceForMascot({ id: m.id, name: m.name, subtitle: m.subtitle ?? undefined }),
    }));
  }, [adminMascots]);

  // Flow state
  const [stepIndex, setStepIndex] = useState(0);
  const [bucketId, setBucketId] = useState<string | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [lastReaction, setLastReaction] = useState<string | null>(null);

  const bucket = useMemo(
    () => buckets.find((b) => b.id === bucketId) ?? null,
    [buckets, bucketId],
  );

  // Real skills for the chosen mascot.
  const { skills: mascotSkills, isLoading: skillsLoading, error: skillsError } =
    useMascotSkills(bucket?.mascotId ?? null, true, false);

  const selectedSkill = useMemo<MascotSkill | null>(
    () => mascotSkills.find((s) => s.id === skillId) ?? null,
    [mascotSkills, skillId],
  );

  // ---------------------------------------------------------------------------
  // Chat preview state (step 3)

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Local state for the LLM picker inside the preview input box. The preview
  // calls secureChatStream which routes by the mascot's preferred model, so
  // this selection is visual parity with the real chat — users pick, and we
  // mirror it in the UI without wiring a separate model override path.
  const [chatLLM, setChatLLM] = useState<LLMPreference>('auto');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  // Transient thinking status streamed from the Edge Function (e.g. "Searching
  // the web…", "Reviewing sources…"). `null` means no real status yet, in which
  // case ChainOfThought falls back to cycling contextual steps based on the
  // prompt running in the background. Matches the main chat screen's pattern.
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null);
  // Streaming chain-of-thought — populated chunk by chunk while the model is
  // in its reasoning phase, then frozen onto the finalized assistant message
  // once the main content starts streaming.
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [reasoningSeconds, setReasoningSeconds] = useState<number | undefined>(undefined);
  /** Tracks whether we've already consumed the selected skill on the first turn. */
  const skillUsedRef = useRef<string | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  // ---------------------------------------------------------------------------
  // Bubble (host prompt) animation — independent from mascot crossfade

  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const bubbleTranslate = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    bubbleOpacity.setValue(0);
    bubbleTranslate.setValue(8);
    Animated.parallel([
      Animated.timing(bubbleOpacity, {
        toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(bubbleTranslate, {
        toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();
  }, [stepIndex, bucketId]);

  // Default "host" display when no bucket is picked yet.
  const firstBucket = buckets[0];

  const activeMascot = useMemo(() => {
    if (bucket) {
      return {
        name: bucket.mascotName,
        role: bucket.mascotRole,
        image: bucket.mascotImage,
      };
    }
    if (firstBucket) {
      return {
        name: 'Meet your squad',
        role: 'Four specialists, one setup',
        image: firstBucket.mascotImage,
      };
    }
    return { name: 'Meet your squad', role: '', image: mascotImages.bear };
  }, [bucket, firstBucket]);

  // ---------------------------------------------------------------------------
  // Mascot crossfade — two stacked layers for a smooth handoff.

  const [stagedImage, setStagedImage] = useState<any>(activeMascot.image);
  const [outgoingImage, setOutgoingImage] = useState<any>(null);
  const stagedOpacity = useRef(new Animated.Value(1)).current;
  const stagedScale = useRef(new Animated.Value(1)).current;
  const stagedTranslateY = useRef(new Animated.Value(0)).current;
  const outgoingOpacity = useRef(new Animated.Value(0)).current;
  const outgoingScale = useRef(new Animated.Value(1)).current;
  const outgoingTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeMascot.image === stagedImage) return;

    setOutgoingImage(stagedImage);
    outgoingOpacity.setValue(1);
    outgoingScale.setValue(1);
    outgoingTranslateY.setValue(0);

    setStagedImage(activeMascot.image);
    stagedOpacity.setValue(0);
    stagedScale.setValue(0.94);
    stagedTranslateY.setValue(10);

    Animated.parallel([
      Animated.timing(outgoingOpacity, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(outgoingScale, { toValue: 0.92, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(outgoingTranslateY, { toValue: -6, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(stagedOpacity, { toValue: 1, duration: 360, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(stagedScale, { toValue: 1, duration: 420, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(stagedTranslateY, { toValue: 0, duration: 420, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setOutgoingImage(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMascot.image]);

  const bounceMascot = () => {
    Animated.sequence([
      Animated.timing(stagedScale, {
        toValue: 1.06, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(stagedScale, {
        toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();
  };

  // ---------------------------------------------------------------------------
  // Prompt (host bubble text).
  //
  // Step 0 has its own hero layout and doesn't go through currentPrompt.
  // Step 1: short lead-in before a mascot is picked, then the mascot's own
  //   conversational self-intro once picked.
  // Step 2: short lead-in before a skill is picked, then the mascot explains
  //   what that skill will do using its skill_summary.
  // Step 3: live chat preview, bubble steps aside.

  const bucketLeadIn =
    "Four specialists. Pick the one that fits what's on your plate. They'll tell you what they do.";

  const skillLeadIn =
    "These are my Skills. Pre-built workflows I know work. Pick one and I'll tell you what it does.";

  const currentPrompt = useMemo(() => {
    if (stepIndex === 1) {
      // Before a pick: invite them in. After: mascot's own self-intro.
      return bucket ? bucket.voice.intro : bucketLeadIn;
    }
    if (stepIndex === 2) {
      if (skillsLoading) return "One sec. Pulling up what I do best.";
      if (skillsError) return "Couldn't load skills. Skip and try again later.";
      if (mascotSkills.length === 0) return "No skills loaded yet. Skip for now.";
      if (selectedSkill && bucket) {
        return bucket.voice.skillPicked(
          selectedSkill.skill_label,
          selectedSkill.skill_summary,
        );
      }
      return skillLeadIn;
    }
    // Step 0 renders its own hero; step 3 renders its own chat. No bubble.
    return '';
  }, [stepIndex, bucket, selectedSkill, skillsLoading, skillsError, mascotSkills.length]);

  const hasAnsweredCurrent =
    stepIndex === 0 || // Hero intro — always allow "Continue"
    (stepIndex === 1 && bucketId !== null) ||
    (stepIndex === 2 && skillId !== null) ||
    (stepIndex === 3 && !isStreaming);

  // ---------------------------------------------------------------------------
  // Handlers

  const handleSelectBucket = (id: string) => {
    setBucketId(id);
    setSkillId(null);
    const b = buckets.find((x) => x.id === id);
    setLastReaction(b?.voice.intro ?? null);
    // A new bucket means a new mascot — reset the preview chat so we don't
    // carry messages from a different mascot into a new conversation.
    setChatMessages([]);
    setStreamingContent('');
    setPreviewError(null);
    skillUsedRef.current = null;
  };

  const handleSelectSkill = (s: MascotSkill) => {
    setSkillId(s.id);
    setLastReaction(
      bucket?.voice.skillPicked(s.skill_label, s.skill_summary) ?? null,
    );
    bounceMascot();
    // New skill pick = reset first-turn skill state. Don't pre-fill inputText
    // here — step 3's auto-send handles the first message, and a pre-filled
    // input would flash briefly before being cleared.
    skillUsedRef.current = null;
  };

  const handleSkip = () => router.replace('/(onboarding)/showcase');
  const handleFinish = () => router.replace('/(onboarding)/showcase');

  const handleContinue = () => {
    setLastReaction(null);
    if (stepIndex < TOTAL_STEPS - 1) {
      const next = stepIndex + 1;
      setStepIndex(next);
      // Landing on the chat preview with a skill selected? Auto-send, just
      // like tapping a skill card from the agents view does (which routes
      // to /chat with initialMessage and auto-fires it after ~500ms). Small
      // delay lets the chat UI render before the message comes in so the
      // user sees the message land, not appear pre-stamped.
      if (next === 3 && selectedSkill && chatMessages.length === 0) {
        const labelToSend = selectedSkill.skill_label;
        setTimeout(() => {
          void handleSend(labelToSend);
        }, 400);
      }
    } else {
      handleFinish();
    }
  };

  // ---------------------------------------------------------------------------
  // Chat — ephemeral conversation with the chosen mascot. Matches the real
  // chat screen's behavior: skill prompt is applied only on the first turn via
  // skillId param (server resolves the full skill_prompt); subsequent turns
  // are normal chat.

  const handleSend = async (text: string) => {
    if (!bucket) return;
    if (!text.trim()) return;
    if (isStreaming) return;

    const trimmed = text.trim();
    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setInputText('');
    setPreviewError(null);
    setIsStreaming(true);
    setStreamingContent('');
    setThinkingStatus(null);
    setStreamingReasoning('');
    setIsReasoning(false);
    setReasoningSeconds(undefined);

    // Apply the skill only on the first turn of the conversation. The real
    // chat (app/chat/[mascotId].tsx) doesn't rely on skillId alone — it also
    // swaps the last user message's content with the full skill_prompt
    // before sending, because the Edge Function's system-prompt injection
    // path isn't guaranteed to resolve a skill from just the id (provider
    // routing, deploy drift, etc.). We mirror that here so the preview
    // actually executes the skill instead of answering the bare label.
    const firstTurn = skillUsedRef.current === null;
    const skillToUse =
      firstTurn && selectedSkill ? selectedSkill.id : undefined;
    if (firstTurn && selectedSkill) skillUsedRef.current = selectedSkill.id;
    const normalizeProvider = (raw?: string | null) => {
      const p = (raw || '').toLowerCase().trim();
      if (p === 'openai' || p === 'gemini' || p === 'perplexity' || p === 'grok' || p === 'claude') {
        return p as 'openai' | 'gemini' | 'perplexity' | 'grok' | 'claude';
      }
      return undefined;
    };
    const skillProvider = normalizeProvider(selectedSkill?.preferred_provider);
    const providerOverride =
      chatLLM === 'auto'
        ? skillProvider // same precedence as normal chat: skill provider wins in auto mode
        : normalizeProvider(chatLLM);

    const messagesForLLM = nextMessages.map((m, i) => {
      const isLast = i === nextMessages.length - 1;
      if (
        firstTurn &&
        isLast &&
        m.role === 'user' &&
        selectedSkill?.skill_prompt
      ) {
        // Match real chat behavior for skill previews: send the full skill
        // prompt AND the user's actual request so the model executes the
        // structured template against this concrete question (instead of
        // receiving a naked template with no query payload).
        return {
          role: m.role,
          content: `${selectedSkill.skill_prompt}\n\nUser request:\n${m.content}`,
        };
      }
      return { role: m.role, content: m.content };
    });

    let full = '';
    let reasoningBuf = '';
    let localReasoningSeconds: number | undefined = undefined;
    try {
      await secureChatStream(
        bucket.mascotId,
        messagesForLLM,
        (chunk) => {
          if (!isMountedRef.current) return;
          // First real content chunk — answer tokens are flowing. Drop the
          // thinking indicator and flag reasoning-phase as ended (if the
          // backend didn't already send reasoningDone).
          if (full.length === 0) {
            setThinkingStatus(null);
            setIsReasoning(false);
          }
          full += chunk;
          setStreamingContent(full);
          chatScrollRef.current?.scrollToEnd({ animated: false });
        },
        undefined,        // conversationId — ephemeral
        skillToUse,       // skill UUID as backup for the Edge Function
        providerOverride,
        deepThinkingEnabled,
        undefined,        // image
        bucket.taskCategory, // match normal chat routing by mascot category
        webSearchEnabled,    // same toggle behavior as normal chat
        (status) => {
          // Real status strings from the Edge Function — things like
          // "Searching the web…", "Reviewing sources…", "Drafting response…".
          // ChainOfThought prefers these over its own simulated cycle.
          if (!isMountedRef.current) return;
          setThinkingStatus(status);
        },
        undefined, // onDowngrade
        (chunk) => {
          // Chain-of-thought chunk arrived. Flip into reasoning mode on the
          // first one (so the reasoning block renders) and append.
          if (!isMountedRef.current) return;
          if (reasoningBuf.length === 0) setIsReasoning(true);
          reasoningBuf += chunk;
          setStreamingReasoning(reasoningBuf);
          chatScrollRef.current?.scrollToEnd({ animated: false });
        },
        (seconds) => {
          // Reasoning phase finished. Freeze the timer and collapse the block
          // (ReasoningTrace auto-collapses once isStreaming flips false).
          if (!isMountedRef.current) return;
          localReasoningSeconds = seconds;
          setReasoningSeconds(seconds);
          setIsReasoning(false);
        },
      );
      if (!isMountedRef.current) return;
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: full,
          reasoning: reasoningBuf || undefined,
          reasoningSeconds: localReasoningSeconds,
        },
      ]);
      setStreamingContent('');
      setStreamingReasoning('');
      setIsReasoning(false);
      setThinkingStatus(null);
      setIsStreaming(false);
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setPreviewError(e?.message ?? 'Preview failed. Try again.');
      setStreamingContent('');
      setStreamingReasoning('');
      setIsReasoning(false);
      setThinkingStatus(null);
      setIsStreaming(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Style helpers

  const surfaceBg = mode === 'dark' ? colors.chatBubble : '#FFFFFF';
  const borderColor = colors.outline;
  const selectedBorderColor = colors.primary;

  const cardShadow = Platform.select({
    web: { boxShadow: shadowToCSS('xs') } as object,
    default: shadowToNative('xs'),
  });
  const cardShadowSelected = Platform.select({
    web: { boxShadow: shadowToCSS('md') } as object,
    default: shadowToNative('md'),
  });

  const progressLabel = `Step ${stepIndex + 1} of ${TOTAL_STEPS}`;

  // Markdown styles for assistant bubbles. This is a straight copy of the
  // real chat screen's markdownStyles (app/chat/[mascotId].tsx), so the
  // preview renders tables, code blocks, blockquotes, headings with dividers,
  // and horizontal rules the same way the real chat does. Don't trim this
  // down — the preview is supposed to be a faithful mini-version of the
  // real thing.
  const markdownStyles = useMemo(() => ({
    body: {
      fontFamily: fontFamilies.figtree.regular,
      fontSize: Platform.OS === 'web' ? 15 : 14,
      lineHeight: Platform.OS === 'web' ? 26 : 22,
      color: colors.text,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: Platform.OS === 'web' ? 16 : 12,
    },
    strong: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontWeight: '600' as const,
    },
    em: {
      fontFamily: fontFamilies.figtree.regular,
      fontStyle: 'italic' as const,
    },
    heading1: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontSize: Platform.OS === 'web' ? 20 : 18,
      fontWeight: '600' as const,
      marginTop: Platform.OS === 'web' ? 20 : 16,
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      paddingTop: Platform.OS === 'web' ? 16 : 12,
      borderTopWidth: 1,
      borderTopColor: colors.outline + '30',
      color: colors.text,
      letterSpacing: -0.2,
    },
    heading2: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontSize: Platform.OS === 'web' ? 18 : 16,
      fontWeight: '600' as const,
      marginTop: Platform.OS === 'web' ? 18 : 14,
      marginBottom: Platform.OS === 'web' ? 6 : 5,
      paddingTop: Platform.OS === 'web' ? 12 : 10,
      borderTopWidth: 1,
      borderTopColor: colors.outline + '30',
      color: colors.text,
      letterSpacing: -0.1,
    },
    heading3: {
      fontFamily: fontFamilies.figtree.medium,
      fontSize: Platform.OS === 'web' ? 16 : 14,
      fontWeight: '500' as const,
      marginTop: Platform.OS === 'web' ? 16 : 12,
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      paddingTop: Platform.OS === 'web' ? 10 : 8,
      borderTopWidth: 1,
      borderTopColor: colors.outline + '25',
      color: colors.text,
    },
    bullet_list: {
      marginTop: Platform.OS === 'web' ? 4 : 3,
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      paddingLeft: Platform.OS === 'web' ? 4 : 3,
    },
    ordered_list: {
      marginTop: Platform.OS === 'web' ? 4 : 3,
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      paddingLeft: Platform.OS === 'web' ? 4 : 3,
    },
    list_item: {
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      paddingLeft: Platform.OS === 'web' ? 4 : 3,
    },
    code_inline: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: Platform.OS === 'web' ? 13 : 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      color: colors.primary,
    },
    code_block: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: Platform.OS === 'web' ? 13 : 12,
      backgroundColor: colors.surface,
      padding: Platform.OS === 'web' ? 12 : 10,
      borderRadius: 8,
      marginVertical: Platform.OS === 'web' ? 6 : 5,
      color: colors.text,
    },
    fence: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: Platform.OS === 'web' ? 13 : 12,
      backgroundColor: colors.surface,
      padding: Platform.OS === 'web' ? 12 : 10,
      borderRadius: 8,
      marginVertical: Platform.OS === 'web' ? 6 : 5,
      color: colors.text,
    },
    blockquote: {
      backgroundColor: colors.surface,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: Platform.OS === 'web' ? 16 : 12,
      paddingRight: Platform.OS === 'web' ? 16 : 12,
      paddingVertical: Platform.OS === 'web' ? 12 : 10,
      marginVertical: Platform.OS === 'web' ? 12 : 10,
      borderRadius: 4,
      fontFamily: fontFamilies.figtree.regular,
    },
    link: {
      color: colors.primary,
      textDecorationLine: 'underline' as const,
    },
    hr: {
      backgroundColor: colors.outline,
      height: 1,
      marginVertical: Platform.OS === 'web' ? 16 : 12,
      marginHorizontal: 0,
      opacity: 0.3,
    },
  }), [colors]);

  // ---------------------------------------------------------------------------
  // Early returns

  if (mascotsLoading || buckets.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          {mascotsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={[textStyles.body, { color: colors.textMuted, textAlign: 'center' }]}>
              No mascots available yet.
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render helpers

  const renderBubble = () => (
    <Animated.View
      style={[
        styles.bubble,
        {
          backgroundColor: surfaceBg,
          borderColor,
          opacity: bubbleOpacity,
          transform: [{ translateY: bubbleTranslate }],
        },
        cardShadow,
      ]}
    >
      <Text style={[textStyles.message, { color: colors.text, textAlign: 'center' }]}>
        {lastReaction ?? currentPrompt}
      </Text>
      <View
        style={[
          styles.bubbleTail,
          { backgroundColor: surfaceBg, borderColor },
        ]}
      />
    </Animated.View>
  );

  /**
   * Step 0 — hero intro.
   *
   * Stock Bear (or whoever is first in admin sort) at the top, then a single
   * speech bubble underneath that holds the full walkthrough text. All
   * paragraphs render at once — no pagination — so the user can skim up and
   * down at their own pace and go back to re-read anything without needing
   * a back button.
   *
   * Everything sits inside a fixed-flex column (ScrollView with flexGrow) so
   * the mascot stays anchored to the top and only the bubble content area
   * scrolls if the text overflows on short viewports. This is what keeps the
   * layout from jumping when the user moves from step 0 into step 1.
   */
  const renderHeroIntro = () => {
    const host = buckets.find((b) => b.id === '1') ?? firstBucket;
    if (!host) return null;

    return (
      <ScrollView
        style={styles.heroScroll}
        contentContainerStyle={styles.heroScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroStage}>
          <Image
            source={host.mascotImage}
            style={styles.heroMascot}
            resizeMode="contain"
          />
          <Text style={[textStyles.h2, styles.heroName, { color: colors.text }]}>
            {host.mascotName}
          </Text>
          {host.mascotRole ? (
            <Text
              style={[textStyles.caption, styles.heroRole, { color: colors.textMuted }]}
            >
              {host.mascotRole}
            </Text>
          ) : null}

          {/*
           * Single speech bubble containing every intro paragraph. Same
           * visual language as the in-step bubbles (surface bg, outline
           * border, rounded, xs shadow, downward tail) so when the user
           * advances to step 1 the bubble style is already familiar.
           */}
          <Animated.View
            style={[
              styles.heroBubble,
              {
                backgroundColor: surfaceBg,
                borderColor,
                opacity: bubbleOpacity,
                transform: [{ translateY: bubbleTranslate }],
              },
              cardShadow,
            ]}
          >
            {INTRO_PARAGRAPHS.map((para, idx) => (
              <Text
                key={idx}
                style={[
                  textStyles.body,
                  { color: colors.text },
                  idx < INTRO_PARAGRAPHS.length - 1 && styles.heroBubblePara,
                ]}
              >
                {para}
              </Text>
            ))}
          </Animated.View>
        </View>
      </ScrollView>
    );
  };

  const renderStage = () => (
    <View style={styles.stage}>
      {renderBubble()}
      <View style={styles.mascotStage}>
        {outgoingImage ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.mascotLayer,
              {
                opacity: outgoingOpacity,
                transform: [
                  { translateY: outgoingTranslateY },
                  { scale: outgoingScale },
                ],
              },
            ]}
          >
            <Image source={outgoingImage} style={styles.mascot} resizeMode="contain" />
          </Animated.View>
        ) : null}
        <Animated.View
          style={[
            styles.mascotLayer,
            {
              opacity: stagedOpacity,
              transform: [
                { translateY: stagedTranslateY },
                { scale: stagedScale },
              ],
            },
          ]}
        >
          <Image source={stagedImage} style={styles.mascot} resizeMode="contain" />
        </Animated.View>
      </View>
      <Text style={[textStyles.h3, { color: colors.text, marginTop: 4 }]}>
        {activeMascot.name}
      </Text>
      <Text style={[textStyles.caption, { color: colors.textMuted, marginTop: 2 }]}>
        {activeMascot.role}
      </Text>
    </View>
  );

  const renderBucketCards = () => (
    <View style={styles.answers}>
      {buckets.map((opt) => {
        const isSelected = bucketId === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => handleSelectBucket(opt.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.bucketCard,
              {
                backgroundColor: surfaceBg,
                borderColor: isSelected ? selectedBorderColor : borderColor,
                opacity: pressed ? 0.9 : 1,
              },
              isSelected ? cardShadowSelected : cardShadow,
            ]}
          >
            <Image source={opt.mascotImage} style={styles.bucketMascot} resizeMode="contain" />
            <View style={styles.bucketTextWrap}>
              <Text style={[textStyles.message, { color: colors.text }]}>{opt.label}</Text>
              {opt.sub ? (
                <Text
                  style={[textStyles.caption, { color: colors.textMuted, marginTop: 2 }]}
                  numberOfLines={2}
                >
                  {opt.sub}
                </Text>
              ) : null}
            </View>
            {isSelected && (
              <View style={[styles.checkDot, { backgroundColor: selectedBorderColor }]}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const renderSkillCards = () => {
    if (skillsLoading) {
      return (
        <View style={styles.skillsLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (skillsError || mascotSkills.length === 0) {
      return (
        <View style={styles.skillsLoading}>
          <Text style={[textStyles.body, { color: colors.textMuted, textAlign: 'center' }]}>
            {skillsError ? 'Could not load skills.' : 'No skills available yet.'}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.answers}>
        {mascotSkills.map((s) => {
          const isSelected = skillId === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => handleSelectSkill(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.bucketCard,
                {
                  backgroundColor: surfaceBg,
                  borderColor: isSelected ? selectedBorderColor : borderColor,
                  opacity: pressed ? 0.9 : 1,
                },
                isSelected ? cardShadowSelected : cardShadow,
              ]}
            >
              {/*
               * Skill cards reuse step 1's bucketCard padding/border/check
               * dot but deliberately skip the mascot image — showing the
               * same face on every skill under a single mascot would be
               * visual noise. The speech bubble above already makes it
               * clear whose skills these are.
               */}
              <View style={styles.bucketTextWrap}>
                <Text style={[textStyles.message, { color: colors.text }]}>
                  {s.skill_label}
                </Text>
              </View>
              {isSelected && (
                <View style={[styles.checkDot, { backgroundColor: selectedBorderColor }]}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderChatPreview = () => {
    if (!bucket) return null;

    const placeholder = selectedSkill
      ? `Ask ${bucket.mascotName}…`
      : 'Write a message';

    return (
      <View style={styles.chatWrap}>
        {/* Compact header — mirrors the real chat screen's avatar + name/subtitle */}
        <View style={[styles.chatHeader, { borderBottomColor: borderColor }]}>
          <Image
            source={bucket.mascotImage}
            style={styles.chatHeaderAvatar}
            resizeMode="contain"
          />
          <View style={styles.chatHeaderTextWrap}>
            <Text style={[textStyles.message, { color: colors.text }]}>
              {bucket.mascotName}
            </Text>
            <Text style={[textStyles.caption, { color: colors.textMuted }]}>
              Preview · {bucket.mascotRole}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={chatScrollRef}
          style={[styles.chatScroll, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.chatScrollContent}
          onContentSizeChange={() =>
            chatScrollRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
        >
          {chatMessages.length === 0 && !isStreaming && (
            <View style={styles.chatEmpty}>
              <Text
                style={[textStyles.body, { color: colors.textMuted, textAlign: 'center' }]}
              >
                {selectedSkill
                  ? `Hit send to run "${selectedSkill.skill_label}", or edit the prompt and ask anything.`
                  : `Ask ${bucket.mascotName} anything to see how they work.`}
              </Text>
            </View>
          )}

          {chatMessages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageWrapper,
                msg.role === 'user'
                  ? styles.userMessageWrapper
                  : styles.assistantMessageWrapper,
              ]}
            >
              {msg.role === 'user' ? (
                <View style={[styles.userBubble, { backgroundColor: colors.chatBubble }]}>
                  <Text
                    style={[
                      styles.messageText,
                      { color: colors.text, fontFamily: fontFamilies.figtree.medium },
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              ) : (
                <View style={styles.assistantMessage}>
                  {/* Persisted reasoning trace for past assistant turns —
                      collapsed by default, user can tap to re-read. */}
                  {msg.reasoning ? (
                    <ReasoningTrace
                      reasoning={msg.reasoning}
                      isStreaming={false}
                      seconds={msg.reasoningSeconds}
                    />
                  ) : null}
                  <Markdown style={markdownStyles}>
                    {cleanMessageContent(msg.content)}
                  </Markdown>
                </View>
              )}
            </View>
          ))}

          {/* Live reasoning trace — renders as soon as the first reasoning
              chunk arrives and keeps streaming until reasoningDone. Sits
              above the streaming answer bubble, same as Claude's UI. */}
          {isStreaming && (streamingReasoning.length > 0 || isReasoning) && (
            <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
              <View style={styles.assistantMessage}>
                <ReasoningTrace
                  reasoning={streamingReasoning}
                  isStreaming={isReasoning}
                  seconds={reasoningSeconds}
                  defaultExpanded
                />
              </View>
            </View>
          )}

          {isStreaming && streamingContent.length > 0 && (
            <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
              <View style={styles.assistantMessage}>
                <Markdown style={markdownStyles}>
                  {cleanMessageContent(streamingContent)}
                </Markdown>
                <View style={styles.cursorRow}>
                  <StreamingCursor />
                </View>
              </View>
            </View>
          )}

          {/* Pre-reasoning indicator. Only shows when we have NO reasoning
              yet AND no answer yet — i.e. the request is in-flight but the
              backend hasn't started streaming reasoning or content. Once
              reasoning tokens start flowing, ReasoningTrace above takes over. */}
          {isStreaming &&
            streamingContent.length === 0 &&
            streamingReasoning.length === 0 &&
            !isReasoning && (
              <View
                style={[
                  styles.messageWrapper,
                  styles.assistantMessageWrapper,
                ]}
              >
                <ChainOfThought
                  status={thinkingStatus}
                  contextPrompt={
                    selectedSkill?.skill_prompt ??
                    chatMessages.filter((m) => m.role === 'user').slice(-1)[0]?.content
                  }
                />
              </View>
            )}

          {previewError && !isStreaming && (
            <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
              <Text
                style={[textStyles.caption, { color: colors.error ?? '#D04A4A' }]}
              >
                {previewError}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.chatInputWrap}>
          {/*
           * Mirrors the real chat screen's ChatInputBox usage exactly:
           * LLM picker on the left, add/web-search/send on the right. Showing
           * the LLM picker isn't just cosmetic — it's required for the bottom
           * row's `space-between` layout to push the send button to the right
           * (with only one child, space-between collapses to the left).
           */}
          <ChatInputBox
            value={inputText}
            onChangeText={setInputText}
            onSend={(text) => handleSend(text)}
            placeholder={placeholder}
            mascotColor={bucket.mascotColor ?? '#EDB440'}
            showLLMPicker
            chatLLM={chatLLM}
            onLLMChange={setChatLLM}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={() => setWebSearchEnabled((prev) => !prev)}
            deepThinkingEnabled={deepThinkingEnabled}
            onDeepThinkingToggle={() => setDeepThinkingEnabled((prev) => !prev)}
            isLoading={isStreaming}
            disabled={isStreaming}
          />
        </View>
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Main

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[textStyles.subtitle, { color: colors.textMuted }]}>
            {progressLabel}
          </Text>
          <TextButton label="Skip" onPress={handleSkip} />
        </View>

        {stepIndex === 0 && renderHeroIntro()}
        {stepIndex === 1 && (
          <>
            {renderStage()}
            {renderBucketCards()}
          </>
        )}
        {stepIndex === 2 && (
          <>
            {renderStage()}
            {renderSkillCards()}
          </>
        )}
        {stepIndex === 3 && renderChatPreview()}

        <View style={[styles.footer, isDesktop && styles.footerDesktop]}>
          <View style={styles.buttonWrap}>
            <BigPrimaryButton
              label={stepIndex === TOTAL_STEPS - 1 ? "Let's meet the rest of the squad" : 'Continue'}
              onPress={handleContinue}
              disabled={!hasAnsweredCurrent}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 16 : 8,
    paddingBottom: 16,
  },
  // Wider on desktop than before (was 520) so the step-2 chat has room.
  containerDesktop: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero intro (step 0). Mascot anchored to the top of a flex-grow scroll
  // area so the layout doesn't jump when the user moves into step 1 — the
  // mascot leaves the scroll area, the bubble stays visually similar, and
  // the button sits in the same footer slot across every step.
  heroScroll: { flex: 1 },
  heroScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingVertical: 16,
  },
  heroStage: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  heroMascot: {
    width: 160,
    height: 160,
    marginBottom: 10,
  },
  heroName: {
    textAlign: 'center',
    marginBottom: 2,
  },
  heroRole: {
    textAlign: 'center',
    marginBottom: 18,
  },
  // Single speech bubble wrapping all intro paragraphs. Max width is a
  // little wider than a standard in-step bubble so 4-5 paragraphs stay
  // readable without looking like a balloon.
  heroBubble: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  heroBubblePara: {
    marginBottom: 12,
  },

  // Stage (mascot + bubble)
  stage: { alignItems: 'center', marginTop: 8, marginBottom: 14 },
  bubble: {
    maxWidth: 380,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  mascotStage: {
    width: 132,
    height: 132,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: { width: 132, height: 132 },

  // Bucket + skill cards
  answers: { gap: 10, marginBottom: 16 },
  bucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  bucketMascot: { width: 40, height: 40, marginRight: 12 },
  bucketTextWrap: { flex: 1 },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkMark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  skillsLoading: { paddingVertical: 20, alignItems: 'center' },

  // Chat preview (step 3)
  chatWrap: {
    flex: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  chatHeaderAvatar: { width: 36, height: 36, marginRight: 10 },
  chatHeaderTextWrap: { flex: 1 },
  chatScroll: { flex: 1 },
  chatScrollContent: { paddingVertical: 12, gap: 10 },
  chatEmpty: { paddingTop: 20, paddingHorizontal: 16 },
  chatInputWrap: { marginTop: 8 },

  messageWrapper: { width: '100%' },
  userMessageWrapper: { alignItems: 'flex-end' },
  assistantMessageWrapper: { alignItems: 'flex-start' },
  userBubble: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    borderRadius: 18,
    maxWidth: '85%',
    minWidth: 80,
  },
  assistantMessage: {
    gap: Platform.OS === 'web' ? 6 : 5,
    maxWidth: '100%',
  },
  messageText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    lineHeight: Platform.OS === 'web' ? 20 : 18,
  },
  cursorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },

  // Footer
  footer: { marginTop: 'auto', alignItems: 'stretch' },
  footerDesktop: { alignItems: 'center' },
  buttonWrap: { width: '100%', maxWidth: 420 },
});
