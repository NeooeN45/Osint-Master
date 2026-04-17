/**
 * InstagramPrivSniffer - Phase 7 Module
 * Visualisation de profils Instagram privés via techniques avancées
 * 
 * Techniques:
 * - Cache Google/Bing des posts
 * - Archive.org Wayback Machine
 * - Shadow clones (comptes qui suivent le privé)
 * - API stories highlights (souvent publics)
 * - Mutual friends analysis
 * - Reels publics analysis
 * - Commentaires sur posts publics de tiers
 * - Tag analysis sur photos d'autres comptes
 * 
 * Créé: 17 Avril 2026
 */

import axios from 'axios';
import https from 'https';
import { getCacheService } from './cacheService';

const NO_SSL = new https.Agent({ rejectUnauthorized: false });
const cache = getCacheService();

// Custom axios config type with httpsAgent
type AxiosConfig = Parameters<typeof axios.get>[1] & {
  httpsAgent?: https.Agent;
};

// User Agents rotatifs
const IG_UAS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
];

const randUA = () => IG_UAS[Math.floor(Math.random() * IG_UAS.length)];

// Types
interface PrivateProfileData {
  username: string;
  fullName: string;
  biography: string;
  profilePicUrl: string;
  followers: number;
  following: number;
  isPrivate: boolean;
  postsCount: number;
  externalUrl?: string;
  isBusinessAccount: boolean;
  businessCategory?: string;
}

interface ExposedContent {
  type: 'cached_post' | 'archive' | 'tagged' | 'reel' | 'story_highlight' | 'comment';
  url: string;
  source: string;
  timestamp?: string;
  content?: string;
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

interface SniffResult {
  profile: PrivateProfileData;
  exposedContent: ExposedContent[];
  shadowFollowers: string[];
  mutualFriends: string[];
  metadata: {
    searchTimestamp: string;
    cacheHit: boolean;
    sourcesChecked: string[];
    exposureRisk: 'low' | 'medium' | 'high' | 'critical';
  };
}

export class InstagramPrivSniffer {
  private username: string;
  private sessionId?: string;

  constructor(username: string, sessionId?: string) {
    this.username = username.toLowerCase().trim();
    this.sessionId = sessionId || process.env.IG_SESSION_ID;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MAIN METHOD
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Sniffer un profil privé complet
   */
  async sniff(): Promise<SniffResult> {
    // Check cache
    const cached = await cache.getToolResult('instagramPrivSniffer', this.username);
    if (cached) {
      return { ...cached.result, metadata: { ...cached.result.metadata, cacheHit: true } };
    }

    const startTime = Date.now();
    const sourcesChecked: string[] = [];
    const exposedContent: ExposedContent[] = [];

    // 1. Get basic profile info (publicly available)
    const profile = await this.getProfileInfo();
    sourcesChecked.push('instagram_api');

    // 2. Search Google cache for posts
    const cachedPosts = await this.searchGoogleCache();
    exposedContent.push(...cachedPosts);
    sourcesChecked.push('google_cache');

    // 3. Archive.org search
    const archiveContent = await this.searchArchiveOrg();
    exposedContent.push(...archiveContent);
    sourcesChecked.push('archive_org');

    // 4. Search for tagged photos
    const taggedPhotos = await this.searchTaggedPhotos();
    exposedContent.push(...taggedPhotos);
    sourcesChecked.push('tagged_photos');

    // 5. Reels publics
    const reels = await this.searchReels();
    exposedContent.push(...reels);
    sourcesChecked.push('reels');

    // 6. Story highlights (souvent publics)
    const highlights = await this.searchStoryHighlights();
    exposedContent.push(...highlights);
    sourcesChecked.push('story_highlights');

    // 7. Shadow followers analysis
    const shadowFollowers = await this.findShadowFollowers();
    sourcesChecked.push('shadow_followers');

    // 8. Mutual friends
    const mutualFriends = await this.findMutualFriends();
    sourcesChecked.push('mutual_friends');

    // Calculate exposure risk
    const exposureRisk = this.calculateExposureRisk(exposedContent.length, shadowFollowers.length);

    const result: SniffResult = {
      profile,
      exposedContent,
      shadowFollowers,
      mutualFriends,
      metadata: {
        searchTimestamp: new Date().toISOString(),
        cacheHit: false,
        sourcesChecked,
        exposureRisk,
      },
    };

    // Cache result
    await cache.cacheToolResult('instagramPrivSniffer', this.username, result, Date.now() - startTime);

    return result;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PROFILE INFO
  // ═════════════════════════════════════════════════════════════════════════════

  private async getProfileInfo(): Promise<PrivateProfileData> {
    try {
      // Try web profile info endpoint
      const url = `https://www.instagram.com/api/v1/web/search/web_profile_info/?query=${this.username}`;
      const headers: any = {
        'User-Agent': randUA(),
        'Accept': 'application/json',
        'X-IG-App-ID': '936619743392459',
      };

      if (this.sessionId) {
        headers['Cookie'] = `sessionid=${this.sessionId}`;
      }

      const response = await axios.get(url, { headers, httpsAgent: NO_SSL, timeout: 10000 } as AxiosConfig);
      
      const data = (response.data as any)?.data || (response.data as any);
      const user = data?.user || data;

      return {
        username: this.username,
        fullName: user.full_name || user.fullName || '',
        biography: user.biography || user.bio || '',
        profilePicUrl: user.profile_pic_url || user.profilePicUrl || '',
        followers: user.follower_count || user.followers || 0,
        following: user.following_count || user.following || 0,
        isPrivate: user.is_private || user.isPrivate || true,
        postsCount: user.media_count || user.posts || 0,
        externalUrl: user.external_url || user.externalUrl,
        isBusinessAccount: user.is_business || user.isBusiness || false,
        businessCategory: user.business_category_name || user.category,
      };
    } catch (error) {
      // Fallback: scrape from HTML
      return this.scrapeProfileFromHTML();
    }
  }

  private async scrapeProfileFromHTML(): Promise<PrivateProfileData> {
    try {
      const url = `https://www.instagram.com/${this.username}/`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': randUA() },
        httpsAgent: NO_SSL,
        timeout: 10000,
      } as AxiosConfig);

      const html = response.data as string;
      
      // Extract sharedData from HTML
      const match = html.match(/<script[^>]*>window\._sharedData\s*=\s*({.+?});<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        const user = data.entry_data?.ProfilePage?.[0]?.graphql?.user || {};

        return {
          username: this.username,
          fullName: user.full_name || '',
          biography: user.biography || '',
          profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url || '',
          followers: user.edge_followed_by?.count || 0,
          following: user.edge_follow?.count || 0,
          isPrivate: user.is_private || true,
          postsCount: user.edge_owner_to_timeline_media?.count || 0,
          externalUrl: user.external_url,
          isBusinessAccount: user.is_business_account || false,
          businessCategory: user.business_category_name,
        };
      }

      throw new Error('Could not extract profile data');
    } catch {
      return {
        username: this.username,
        fullName: '',
        biography: '',
        profilePicUrl: '',
        followers: 0,
        following: 0,
        isPrivate: true,
        postsCount: 0,
        isBusinessAccount: false,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // GOOGLE CACHE
  // ═════════════════════════════════════════════════════════════════════════════

  private async searchGoogleCache(): Promise<ExposedContent[]> {
    const results: ExposedContent[] = [];
    
    try {
      const queries = [
        `site:instagram.com ${this.username} "Instagram" "photo"`,
        `cache:instagram.com/p/ ${this.username}`,
        `"${this.username}" site:instagram.com inurl:/p/`,
      ];

      for (const query of queries) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;
        
        try {
          const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': randUA() },
            httpsAgent: NO_SSL,
            timeout: 10000,
          } as AxiosConfig);

          // Extract image URLs from results
          const html = response.data as string;
          const imgMatches = html.match(/"(https:\/\/[^"]*instagram\.com[^"]*)"/g) || [];
          
          imgMatches.forEach((url: string) => {
            const cleanUrl = url.replace(/"/g, '');
            if (!results.find(r => r.url === cleanUrl)) {
              results.push({
                type: 'cached_post',
                url: cleanUrl,
                source: 'google_cache',
              });
            }
          });
        } catch {}
      }
    } catch {}

    return results.slice(0, 20);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ARCHIVE.ORG
  // ═════════════════════════════════════════════════════════════════════════════

  private async searchArchiveOrg(): Promise<ExposedContent[]> {
    const results: ExposedContent[] = [];
    
    try {
      const url = `https://web.archive.org/cdx/search/cdx?url=instagram.com/${this.username}/*&output=json&collapse=urlkey`;
      
      const response = await axios.get(url, {
        headers: { 'User-Agent': randUA() },
        httpsAgent: NO_SSL,
        timeout: 15000,
      } as AxiosConfig);

      const data = response.data;
      if (Array.isArray(data) && data.length > 1) {
        // Skip header row
        for (let i = 1; i < Math.min(data.length, 30); i++) {
          const row = data[i];
          const timestamp = row[1];
          const originalUrl = row[2];
          
          const archiveUrl = `https://web.archive.org/web/${timestamp}/${originalUrl}`;
          
          results.push({
            type: 'archive',
            url: archiveUrl,
            source: 'archive_org',
            timestamp: this.formatArchiveTimestamp(timestamp),
          });
        }
      }
    } catch {}

    return results;
  }

  private formatArchiveTimestamp(timestamp: string): string {
    return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TAGGED PHOTOS
  // ═════════════════════════════════════════════════════════════════════════════

  private async searchTaggedPhotos(): Promise<ExposedContent[]> {
    const results: ExposedContent[] = [];
    
    try {
      // Search for photos where the user is tagged
      const query = `"${this.username}" site:instagram.com "tagged" OR "photos of"`;
      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': randUA() },
        httpsAgent: NO_SSL,
        timeout: 10000,
      } as AxiosConfig);

      const html = response.data as string;
      const matches = html.match(/murl":"(https:\/\/[^"]*instagram\.com[^"]*)"/g) || [];
      
      matches.forEach((match: string) => {
        const url = match.replace('murl":"', '').replace('"', '');
        if (!results.find(r => r.url === url)) {
          results.push({
            type: 'tagged',
            url,
            source: 'bing_images',
          });
        }
      });
    } catch {}

    return results.slice(0, 15);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // REELS
  // ═════════════════════════════════════════════════════════════════════════════

  private async searchReels(): Promise<ExposedContent[]> {
    const results: ExposedContent[] = [];
    
    try {
      // Reels are often public even if account is private
      const url = `https://www.instagram.com/${this.username}/reels/`;
      const headers: any = {
        'User-Agent': randUA(),
        'X-IG-App-ID': '936619743392459',
      };

      if (this.sessionId) {
        headers['Cookie'] = `sessionid=${this.sessionId}`;
      }

      const response = await axios.get(url, { headers, httpsAgent: NO_SSL, timeout: 10000 } as AxiosConfig);
      const html = response.data as string;

      // Extract reel IDs
      const reelMatches = html.match(/\/reel\/([A-Za-z0-9_-]+)/g) || [];
      
      reelMatches.forEach((match: string) => {
        const reelUrl = `https://www.instagram.com${match}`;
        if (!results.find(r => r.url === reelUrl)) {
          results.push({
            type: 'reel',
            url: reelUrl,
            source: 'instagram_reels',
          });
        }
      });
    } catch {}

    return results.slice(0, 10);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STORY HIGHLIGHTS
  // ═════════════════════════════════════════════════════════════════════════════

  private async searchStoryHighlights(): Promise<ExposedContent[]> {
    const results: ExposedContent[] = [];
    
    try {
      // Highlights are often public
      const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${this.username}`;
      const headers: any = {
        'User-Agent': randUA(),
        'X-IG-App-ID': '936619743392459',
      };

      if (this.sessionId) {
        headers['Cookie'] = `sessionid=${this.sessionId}`;
      }

      const response = await axios.get(url, { headers, httpsAgent: NO_SSL, timeout: 10000 } as AxiosConfig);
      const data = (response.data as any)?.data?.user || {};

      // Check for highlight reel
      if (data.highlight_reel_count > 0) {
        results.push({
          type: 'story_highlight',
          url: `https://www.instagram.com/${this.username}/highlights/`,
          source: 'instagram_highlights',
          metadata: { count: data.highlight_reel_count },
        });
      }
    } catch {}

    return results;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SHADOW FOLLOWERS
  // ═════════════════════════════════════════════════════════════════════════════

  private async findShadowFollowers(): Promise<string[]> {
    const followers: string[] = [];
    
    try {
      // Search for "username follows" in Google
      const query = `"${this.username}" "follows" site:instagram.com`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': randUA() },
        httpsAgent: NO_SSL,
        timeout: 10000,
      } as AxiosConfig);

      const html = response.data as string;
      // Extract usernames from results
      const matches = html.match(/instagram\.com\/([A-Za-z0-9_.]+)/g) || [];
      
      matches.forEach((match: string) => {
        const username = match.replace('instagram.com/', '');
        if (username !== this.username && !followers.includes(username)) {
          followers.push(username);
        }
      });
    } catch {}

    return followers.slice(0, 20);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MUTUAL FRIENDS
  // ═════════════════════════════════════════════════════════════════════════════

  private async findMutualFriends(): Promise<string[]> {
    const mutuals: string[] = [];
    
    try {
      // If we have a session, try to get mutual friends
      if (!this.sessionId) return mutuals;

      const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${this.username}`;
      const headers: any = {
        'User-Agent': randUA(),
        'X-IG-App-ID': '936619743392459',
        'Cookie': `sessionid=${this.sessionId}`,
      };

      const response = await axios.get(url, { headers, httpsAgent: NO_SSL, timeout: 10000 } as AxiosConfig);
      const userId = (response.data as any)?.data?.user?.id;

      if (userId) {
        // Get mutual followers
        const mutualUrl = `https://www.instagram.com/api/v1/friendships/${userId}/mutual_followers/`;
        const response = await axios.get(mutualUrl, { headers, httpsAgent: NO_SSL, timeout: 10000 } as AxiosConfig);
        
        const users = (response.data as any)?.users || [];
        users.forEach((user: any) => {
          mutuals.push(user.username);
        });
      }
    } catch {}

    return mutuals.slice(0, 20);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UTILS
  // ═════════════════════════════════════════════════════════════════════════════

  private calculateExposureRisk(
    exposedContentCount: number,
    shadowFollowersCount: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const score = exposedContentCount + (shadowFollowersCount * 0.5);
    
    if (score === 0) return 'low';
    if (score < 5) return 'medium';
    if (score < 15) return 'high';
    return 'critical';
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STATIC METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Sniffer rapide (static)
   */
  static async sniff(username: string, sessionId?: string): Promise<SniffResult> {
    const sniffer = new InstagramPrivSniffer(username, sessionId);
    return sniffer.sniff();
  }

  /**
   * Batch sniffer pour plusieurs comptes
   */
  static async sniffBatch(usernames: string[], sessionId?: string): Promise<SniffResult[]> {
    const results: SniffResult[] = [];
    
    for (const username of usernames) {
      try {
        const result = await InstagramPrivSniffer.sniff(username, sessionId);
        results.push(result);
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.error(`[InstagramPrivSniffer] Failed to sniff ${username}:`, error);
      }
    }
    
    return results;
  }
}

export default InstagramPrivSniffer;
