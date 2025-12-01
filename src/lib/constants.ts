/**
 * Constants used throughout the application
 */

/**
 * Speaker detection patterns for Host identification
 */
export const HOST_PATTERNS: (string | RegExp)[] = [
  // Welcome and introductions
  'welcome back',
  'welcome to',
  'thanks for joining',
  'hey everyone',
  'hi everyone',
  'hello everyone',
  'welcome everyone',
  
  // Questions and prompts
  'can you tell us',
  'so tell me',
  'let me ask',
  'i wanted to call out',
  'i wanted to ask',
  'before we dive',
  'before we get',
  
  // Transitions and hosting
  'moving on',
  'that\'s interesting',
  'this is super interesting',
  'i\'m so happy',
  'okay tom',
  'got it',
  'let\'s dive in',
  'let\'s get started',
  'today i have',
  'today we have',
  'i have an absolute',
  'we\'re going to',
  'so we\'re going to',
  
  // Self-introductions (hosts often introduce themselves)
  /^i\'m\s+\w+/i,  // "I'm Claire" or "I'm John"
  /^this is\s+\w+/i,  // "This is Claire"
  
  // Podcast/show specific
  'this episode is',
  'this episode was',
  'brought to you by',
  'sponsored by',
  
  // Wrapping up
  'thanks so much',
  'thank you so much',
  'thanks for watching',
  'thanks for listening',
  'see you next time',
  'we\'re going to wrap',
  'let\'s wrap up',
]

/**
 * Speaker detection patterns for Guest identification
 */
export const GUEST_PATTERNS: string[] = [
  'thanks for having me',
  'thanks for inviting me',
  'thanks for having us',
  'appreciate you having me',
  'great to be here',
  'happy to be here',
  'excited to be here',
  
  // Guest responses
  'absolutely',
  'what i did',
  'well thanks',
  'i think it\'s',
  'in my experience',
  'what we found',
  'the way i',
  'yeah i think',
  'i wrote this',
  'so i initially',
  'what we\'ve done',
  'in my company',
  'at my company',
  'we built',
  'i built',
]

/**
 * Default processing options
 */
export const DEFAULT_PROCESSING_OPTIONS = {
  speakerDetection: true,
  deduplication: true,
  removeTimestamps: false,
  normalizeText: true,
  maxSegmentLength: 1000,
} as const

/**
 * Text processing constants
 */
export const TEXT_PROCESSING = {
  MIN_SENTENCE_LENGTH: 8,
  MIN_NORMALIZED_LENGTH: 10,
  MAX_PHRASE_DEDUPLICATION_LENGTH: 10,
  MIN_PHRASE_DEDUPLICATION_LENGTH: 2,
} as const

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
  PROCESSING_OPTIONS: 'transcript-processing-options',
} as const

