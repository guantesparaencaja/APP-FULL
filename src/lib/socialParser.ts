/**
 * socialParser.ts — Detect social media video URLs and produce iframe embed URLs.
 * Supports: TikTok, Instagram Reels/Posts, Facebook Videos, YouTube.
 */

export type SocialPlatform = 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'direct' | 'unknown';

export interface ParsedSocialVideo {
  platform: SocialPlatform;
  originalUrl: string;
  embedUrl: string;
  videoId: string | null;
}

const PATTERNS: { platform: SocialPlatform; regex: RegExp; extract: (m: RegExpMatchArray) => string }[] = [
  {
    platform: 'youtube',
    regex: /(?:youtube\.com\/(?:watch\?.*?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i,
    extract: (m) => `https://www.youtube.com/embed/${m[1]}`,
  },
  {
    platform: 'tiktok',
    regex: /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
    extract: (m) => `https://www.tiktok.com/embed/v2/${m[1]}`,
  },
  {
    platform: 'instagram',
    regex: /instagram\.com\/(?:p|reel|reels)\/([\w-]+)/i,
    extract: (m) => `https://www.instagram.com/p/${m[1]}/embed/`,
  },
  {
    platform: 'facebook',
    regex: /facebook\.com\/.*?\/videos\/(\d+)|fb\.watch\/([\w-]+)/i,
    extract: (m) => {
      const id = m[1] || m[2];
      const videoHref = encodeURIComponent(`https://www.facebook.com/video/${id}`);
      return `https://www.facebook.com/plugins/video.php?href=${videoHref}`;
    },
  },
];

export function parseSocialUrl(url: string): ParsedSocialVideo {
  const trimmed = url.trim();

  for (const { platform, regex, extract } of PATTERNS) {
    const match = trimmed.match(regex);
    if (match) {
      return {
        platform,
        originalUrl: trimmed,
        embedUrl: extract(match),
        videoId: match[1] || match[2] || null,
      };
    }
  }

  // Direct media files (.mp4, .webm, .ogg, .mov, .m4v)
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed)) {
    return { platform: 'direct', originalUrl: trimmed, embedUrl: trimmed, videoId: null };
  }

  return { platform: 'unknown', originalUrl: trimmed, embedUrl: trimmed, videoId: null };
}

export function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

export function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?.*?v=|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

export function platformLabel(p: SocialPlatform): string {
  const labels: Record<SocialPlatform, string> = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    facebook: 'Facebook',
    direct: 'Video',
    unknown: 'Video',
  };
  return labels[p];
}

export function platformColor(p: SocialPlatform): string {
  const colors: Record<SocialPlatform, string> = {
    youtube: '#FF0000',
    tiktok: '#00F2EA',
    instagram: '#E4405F',
    facebook: '#1877F2',
    direct: '#8B5CF6',
    unknown: '#6B7280',
  };
  return colors[p];
}
