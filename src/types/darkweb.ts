// ============ DARK WEB & SOCIAL MEDIA PRO TYPES ============

// Dark Web Sources
export type DarkWebSource = 
  | "ahmia"
  | "darksearch"
  | "torch"
  | "not Evil"
  | "pastebin"
  | "zerobin"
  | "ghostbin"
  | "leak_database"
  | "ransomware_gang"
  | "dark_market"
  | "forum"
  | "telegram_dark";

export interface DarkWebSearchResult {
  id: string;
  title: string;
  url: string;
  onionUrl?: string;
  description: string;
  source: DarkWebSource;
  indexedAt: string;
  relevanceScore: number;
  language: string;
  category?: "market" | "forum" | "blog" | "paste" | "database" | "other";
  riskLevel: "low" | "medium" | "high" | "critical";
  extractedEntities: {
    emails: string[];
    usernames: string[];
    cryptoAddresses: string[];
    ips: string[];
    domains: string[];
  };
  screenshot?: string;
  content?: string;
  metadata?: {
    author?: string;
    views?: number;
    replies?: number;
    lastPost?: string;
  };
}

export interface PastebinResult {
  id: string;
  title: string;
  content: string;
  author?: string;
  createdAt: string;
  expiresAt?: string;
  syntax?: string;
  views: number;
  source: "pastebin" | "ghostbin" | "zerobin" | "privatebin";
  url: string;
  extractedData: {
    emails: string[];
    passwords: string[];
    apiKeys: string[];
    ips: string[];
    domains: string[];
    creditCards: string[];
    privateKeys: string[];
  };
  riskLevel: "low" | "medium" | "high" | "critical";
  classification: "credentials" | "leak" | "code" | "config" | "chat" | "other";
}

export interface BreachRecord {
  id: string;
  email: string;
  breachName: string;
  breachDate: string;
  compromisedData: string[];
  description?: string;
  source: string;
  verified: boolean;
  passwordHint?: string;
  hashType?: string;
}

export interface RansomwareVictim {
  id: string;
  groupName: string;
  victimName: string;
  victimCountry?: string;
  victimIndustry?: string;
  website?: string;
  revenue?: string;
  leakPublishedAt?: string;
  dataSize?: string;
  description: string;
  darknetUrl?: string;
  screenshots: string[];
  status: "announced" | "data_stolen" | "published" | "sold";
}

export interface DarkWebMonitorAlert {
  id: string;
  target: string;
  targetType: "email" | "domain" | "username" | "keyword";
  alertType: "new_paste" | "new_breach" | "darkweb_mention" | "ransomware_mention";
  source: DarkWebSource;
  url: string;
  detectedAt: string;
  severity: "low" | "medium" | "high" | "critical";
  details: string;
  rawContent?: string;
  status: "new" | "viewed" | "acknowledged" | "false_positive";
}

// ============ SOCIAL MEDIA PRO TYPES ============

export type SocialPlatform = 
  | "instagram"
  | "twitter"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "reddit"
  | "telegram"
  | "snapchat"
  | "discord"
  | "pinterest"
  | "tumblr"
  | "soundcloud"
  | "spotify"
  | "twitch";

export interface SocialMediaProfile {
  id: string;
  platform: SocialPlatform;
  username: string;
  displayName?: string;
  url: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  joinDate?: string;
  lastActive?: string;
  verified: boolean;
  private: boolean;
  metrics: {
    followers: number;
    following: number;
    posts: number;
    likes?: number;
    views?: number;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    businessEmail?: string;
  };
  extractedEmails: string[];
  extractedPhones: string[];
  extractedUrls: string[];
  hashtags: string[];
  mentions: string[];
  confidence: number;
  foundAt: string;
}

export interface InstagramProfile extends SocialMediaProfile {
  platform: "instagram";
  isBusiness: boolean;
  businessCategory?: string;
  businessAddress?: {
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
  };
  businessPhone?: string;
  businessEmail?: string;
  highlightReels: Array<{
    id: string;
    title: string;
    coverImage: string;
    itemCount: number;
  }>;
  posts: InstagramPost[];
  stories: InstagramStory[];
  taggedUsers: string[];
  similarAccounts: string[];
  externalLinks: string[];
  contentAnalysis: {
    dominantColors: string[];
    locationsTagged: string[];
    frequentHashtags: { tag: string; count: number }[];
    postingSchedule: { day: string; count: number }[];
    engagementRate: number;
  };
}

export interface InstagramPost {
  id: string;
  shortcode: string;
  url: string;
  type: "image" | "video" | "carousel" | "reel";
  caption?: string;
  createdAt: string;
  likes: number;
  comments: number;
  views?: number;
  location?: {
    id: string;
    name: string;
    lat?: number;
    lng?: number;
  };
  hashtags: string[];
  mentions: string[];
  images: string[];
  videoUrl?: string;
  thumbnail?: string;
  altText?: string;
  taggedUsers: string[];
  extractedEmails: string[];
  extractedPhones: string[];
  extractedUrls: string[];
  commentsData?: InstagramComment[];
  isSponsored?: boolean;
  sponsorInfo?: {
    name?: string;
    website?: string;
  };
}

export interface InstagramStory {
  id: string;
  url: string;
  type: "image" | "video";
  createdAt: string;
  expiresAt: string;
  mentions: string[];
  hashtags: string[];
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  music?: {
    title: string;
    artist: string;
  };
  poll?: {
    question: string;
    options: string[];
  };
  question?: {
    text: string;
  };
  quiz?: {
    question: string;
    correctAnswer: string;
    options: string[];
  };
  swipeLink?: string;
  extractedData: {
    emails: string[];
    phones: string[];
    urls: string[];
  };
}

export interface InstagramComment {
  id: string;
  username: string;
  text: string;
  createdAt: string;
  likes: number;
  replies: number;
  isVerified: boolean;
  extractedEmails: string[];
  extractedPhones: string[];
}

export interface TwitterProfile extends SocialMediaProfile {
  platform: "twitter";
  handle: string;
  protected: boolean;
  blueVerified: boolean;
  bioEntities: {
    mentions: string[];
    hashtags: string[];
    urls: string[];
  };
  pinnedTweet?: TwitterTweet;
  recentTweets: TwitterTweet[];
  mediaTweets: TwitterTweet[];
  replyTweets: TwitterTweet[];
  followingTopics: string[];
  spacesHosted: number;
  listsMember: number;
  listsCreated: number;
}

export interface TwitterTweet {
  id: string;
  url: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views?: number;
  media: Array<{
    type: "photo" | "video" | "gif";
    url: string;
  }>;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  isReply: boolean;
  isRetweet: boolean;
  isQuote: boolean;
  location?: string;
  device?: string;
}

export interface FacebookProfile extends SocialMediaProfile {
  platform: "facebook";
  profileId?: string;
  work: Array<{
    company: string;
    position?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  }>;
  education: Array<{
    school: string;
    degree?: string;
    startDate?: string;
    endDate?: string;
  }>;
  familyMembers: Array<{
    name: string;
    relationship: string;
  }>;
  lifeEvents: Array<{
    year: number;
    event: string;
  }>;
  checkins: Array<{
    location: string;
    date: string;
    lat?: number;
    lng?: number;
  }>;
  photos: Array<{
    url: string;
    date?: string;
    taggedUsers: string[];
    location?: string;
  }>;
}

export interface TikTokProfile extends SocialMediaProfile {
  platform: "tiktok";
  nickname: string;
  signature: string;
  region: string;
  videos: number;
  likes: number;
  diggs: number;
  hearts: number;
  fans: number;
  following: number;
  verified: boolean;
  secret: boolean;
  openFavorite: boolean;
  bioLink?: {
    link: string;
    title?: string;
  };
  recentVideos: TikTokVideo[];
}

export interface TikTokVideo {
  id: string;
  url: string;
  description: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  duration: number;
  music: {
    title: string;
    author: string;
  };
  hashtags: string[];
  mentions: string[];
  coverImage: string;
  downloadUrl?: string;
}

export interface SocialScanRequest {
  query: string;
  queryType: "username" | "email" | "phone" | "fullname" | "image";
  platforms: SocialPlatform[];
  depth: "quick" | "standard" | "deep";
  includeArchived: boolean;
  extractContacts: boolean;
  downloadMedia: boolean;
  analyzeRelationships: boolean;
}

export interface SocialScanResult {
  id: string;
  request: SocialScanRequest;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  startedAt: string;
  completedAt?: string;
  profilesFound: SocialMediaProfile[];
  instagramProfiles: InstagramProfile[];
  twitterProfiles: TwitterProfile[];
  facebookProfiles: FacebookProfile[];
  tiktokProfiles: TikTokProfile[];
  crossPlatformMatches: Array<{
    platforms: SocialPlatform[];
    confidence: number;
    matchingCriteria: string[];
  }>;
  extractedData: {
    allEmails: string[];
    allPhones: string[];
    allUsernames: string[];
    allLocations: string[];
    allImages: string[];
  };
  timeline: Array<{
    date: string;
    platform: SocialPlatform;
    event: string;
    url?: string;
  }>;
  confidence: number;
  reportUrl?: string;
}

// Search Operators
export const SOCIAL_SEARCH_OPERATORS = {
  exact: `"term"`,
  exclude: `-term`,
  or: `term1 OR term2`,
  site: `site:instagram.com`,
  from: `from:username`,
  to: `to:username`,
  hashtag: `#hashtag`,
  mention: `@username`,
  since: `since:2023-01-01`,
  until: `until:2023-12-31`,
  near: `near:location`,
  within: `within:10km`,
  filter_images: `filter:images`,
  filter_videos: `filter:videos`,
  filter_links: `filter:links`,
} as const;
