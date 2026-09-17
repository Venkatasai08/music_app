// Audio Formatting and Stream Selection Utilities

import { AudioQuality, QualityDownloadLink } from '../types/music';

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatDurationMs(ms: number): string {
  return formatTime(ms / 1000);
}

export function sanitizeAudioUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (clean.startsWith('//')) {
    clean = 'https:' + clean;
  } else if (clean.startsWith('http://')) {
    clean = clean.replace('http://', 'https://');
  }
  return clean;
}

export function getPrioritizedStreamUrls(
  links: QualityDownloadLink[] | undefined,
  preferredQuality: AudioQuality = '320kbps',
  fallbackUrl: string = ''
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const addUrl = (u: string | undefined) => {
    if (!u || typeof u !== 'string') return;
    const clean = sanitizeAudioUrl(u);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      urls.push(clean);
    }
  };

  if (links && Array.isArray(links) && links.length > 0) {
    // 1. Exact match for preferred quality
    const exact = links.find((link) => {
      if (!link) return false;
      const q = String(link.quality || '').toLowerCase();
      const target = preferredQuality.toLowerCase();
      return q === target || q.includes(target.replace('kbps', ''));
    });
    if (exact && exact.url) {
      addUrl(exact.url);
    }

    // 2. Compatibility hierarchy (If preferred is 320k, add 320k -> 160k -> 96k -> 48k -> 12k. If preferred is 160k, add 160k -> 320k -> 96k -> 48k -> 12k)
    const hierarchy: AudioQuality[] =
      preferredQuality === '320kbps'
        ? ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps']
        : preferredQuality === '160kbps'
        ? ['160kbps', '320kbps', '96kbps', '48kbps', '12kbps']
        : [preferredQuality, '160kbps', '320kbps', '96kbps', '48kbps', '12kbps'];

    for (const q of hierarchy) {
      const match = links.find((l) => {
        if (!l) return false;
        const curQ = String(l.quality || '').toLowerCase();
        return curQ === q || curQ.includes(q.replace('kbps', ''));
      });
      if (match && match.url) {
        addUrl(match.url);
      }
    }

    // 3. Any other download links in the array
    for (const item of links) {
      if (item && item.url) {
        addUrl(item.url);
      }
    }
  }

  // 4. Fallback URL
  if (fallbackUrl) {
    addUrl(fallbackUrl);
  }

  return urls;
}

export function selectStreamUrlByQuality(
  links: QualityDownloadLink[] | undefined,
  preferredQuality: AudioQuality = '320kbps',
  fallbackUrl: string = ''
): string {
  const candidates = getPrioritizedStreamUrls(links, preferredQuality, fallbackUrl);
  return candidates[0] || sanitizeAudioUrl(fallbackUrl);
}

export function decodeHtmlEntities(text: any): string {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') {
    if (typeof text === 'object') {
      if (typeof text.name === 'string') return decodeHtmlEntities(text.name);
      if (typeof text.title === 'string') return decodeHtmlEntities(text.title);
      if (Array.isArray(text)) return text.map((t) => decodeHtmlEntities(t)).filter(Boolean).join(', ');
    }
    return String(text || '');
  }
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .trim();
}

export function extractString(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    const decoded = decodeHtmlEntities(val);
    return decoded || fallback;
  }
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return decodeHtmlEntities(val.name) || fallback;
    if (typeof val.title === 'string') return decodeHtmlEntities(val.title) || fallback;
    if (typeof val.name === 'object' && val.name) return extractString(val.name, fallback);
    if (typeof val.title === 'object' && val.title) return extractString(val.title, fallback);
    if (Array.isArray(val)) {
      const parts = val.map((item) => extractString(item)).filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : fallback;
    }
  }
  return fallback;
}

export function sanitizeImageUrl(url: string | undefined, defaultPlaceholder?: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return (
      defaultPlaceholder ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80'
    );
  }
  let clean = url.trim();
  // If protocol-relative url
  if (clean.startsWith('//')) {
    clean = 'https:' + clean;
  } else if (clean.startsWith('http://')) {
    clean = clean.replace('http://', 'https://');
  }
  // saavn 150x150 upgrade to 500x500
  if (clean.includes('150x150')) {
    clean = clean.replace('150x150', '500x500');
  } else if (clean.includes('50x50')) {
    clean = clean.replace('50x50', '500x500');
  }
  return clean;
}

export function formatNumberCompact(num: number | undefined): string {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

