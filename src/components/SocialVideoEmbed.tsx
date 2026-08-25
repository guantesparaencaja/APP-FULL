/**
 * SocialVideoEmbed.tsx — Responsive iframe embed for TikTok, Instagram, Facebook, YouTube.
 * Falls back to a clickable link if the URL is unknown.
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { parseSocialUrl, platformLabel, platformColor, type ParsedSocialVideo } from '../lib/socialParser';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface SocialVideoEmbedProps {
  url: string;
  title?: string;
  className?: string;
  maxHeight?: number;
}

export function SocialVideoEmbed({ url, title, className = '', maxHeight = 500 }: SocialVideoEmbedProps) {
  const [loadError, setLoadError] = useState(false);
  const parsed: ParsedSocialVideo = parseSocialUrl(url);

  if (!url || url.trim() === '') {
    return null;
  }

  if (parsed.platform === 'direct') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`relative w-full overflow-hidden rounded-xl bg-black ${className}`}
        style={{ maxHeight }}
      >
        <video
          src={parsed.embedUrl}
          title={title || 'Video'}
          className="w-full h-full object-contain"
          style={{ maxHeight }}
          controls
          playsInline
          preload="metadata"
        />
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white pointer-events-none"
          style={{ backgroundColor: platformColor('direct') + 'CC' }}
        >
          Video
        </div>
      </motion.div>
    );
  }

  if (parsed.platform === 'unknown' || loadError) {
    return (
      <a
        href={parsed.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 text-sm text-primary hover:underline ${className}`}
      >
        <ExternalLink className="w-4 h-4 shrink-0" />
        <span className="truncate">{title || parsed.originalUrl}</span>
      </a>
    );
  }

  const aspectRatio = parsed.platform === 'youtube' ? 'aspect-video' : 'aspect-[9/16]';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative w-full overflow-hidden rounded-xl bg-black ${className}`}
      style={{ maxHeight }}
    >
      <div className={`w-full ${aspectRatio} max-h-[${maxHeight}px]`}>
        <iframe
          src={parsed.embedUrl}
          title={title || `${platformLabel(parsed.platform)} video`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          onError={() => setLoadError(true)}
        />
      </div>

      {/* Platform badge */}
      <div
        className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white pointer-events-none"
        style={{ backgroundColor: platformColor(parsed.platform) + 'CC' }}
      >
        {platformLabel(parsed.platform)}
      </div>
    </motion.div>
  );
}
