import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { Track, AudioQuality } from '../types/music';
import { listenFreeApi } from '../api/listenFreeApi';
import { tuneFreeApi } from '../api/tuneFreeApi';
import { selectStreamUrlByQuality } from '../utils/audioUtils';

const { MediaSaverModule } = NativeModules;

export interface DownloadResult {
  success: boolean;
  localUri?: string;
  publicPath?: string;
  assetId?: string;
  error?: string;
}

/**
 * Sanitizes a filename to remove illegal filesystem characters
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

class DownloadService {
  /**
   * Request media library write permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      return status === 'granted';
    } catch (e) {
      console.warn('[DownloadService] Permission request failed:', e);
      return false;
    }
  }

  /**
   * Resolves the highest quality direct MP3/audio stream URL for downloading
   */
  async resolveDownloadUrl(track: Track, preferredQuality: AudioQuality = '320kbps'): Promise<string | null> {
    // 1. Check if track already has downloadUrls
    if (track.downloadUrls && track.downloadUrls.length > 0) {
      const best = selectStreamUrlByQuality(track.downloadUrls, preferredQuality, track.streamUrl);
      if (best) return best;
    }

    // 2. For ListenFree tracks, fetch full song details
    if (track.sourceEngine === 'listen_free' && track.id) {
      try {
        const details = await listenFreeApi.getSongDetails(track.id);
        if (details?.downloadUrls && details.downloadUrls.length > 0) {
          const url = selectStreamUrlByQuality(details.downloadUrls, preferredQuality, details.streamUrl);
          if (url) return url;
        }
      } catch (e) {
        console.warn('[DownloadService] ListenFree song details error:', e);
      }
    }

    // 3. For TuneFree / Freefy tracks, check matches or resolve YouTube stream
    if (track.sourceEngine === 'tune_free' || track.sourceEngine === 'freefy') {
      try {
        // First try finding high quality CDN match via search
        const matched = await listenFreeApi.searchSongs(`${track.name} ${track.artist}`, 1);
        if (matched.length > 0 && matched[0].downloadUrls && matched[0].downloadUrls.length > 0) {
          const url = selectStreamUrlByQuality(matched[0].downloadUrls, preferredQuality, matched[0].streamUrl);
          if (url) return url;
        }

        // Second try resolving source
        if (track.youtubeId) {
          const ytUrl = await listenFreeApi.getYoutubeStreamUrl(track.youtubeId);
          if (ytUrl) return ytUrl;
        }

        const resolved = await tuneFreeApi.resolveTrack(track.name, track.artist);
        if (resolved) {
          const ytUrl = await listenFreeApi.getYoutubeStreamUrl(resolved);
          if (ytUrl) return ytUrl;
        }
      } catch (e) {
        console.warn('[DownloadService] Stream match error:', e);
      }
    }

    // 4. Fallback to existing streamUrl if it's a valid remote URL
    if (track.streamUrl && track.streamUrl.startsWith('http')) {
      return track.streamUrl;
    }

    return null;
  }

  /**
   * Downloads a track and saves it directly to the phone's gallery / music library
   */
  async downloadTrack(
    track: Track,
    preferredQuality: AudioQuality = '320kbps',
    onProgress?: (progress: number) => void
  ): Promise<DownloadResult> {
    try {
      // 1. Resolve direct download URL
      const downloadUrl = await this.resolveDownloadUrl(track, preferredQuality);
      if (!downloadUrl) {
        return {
          success: false,
          error: 'Could not resolve a downloadable audio stream for this track.',
        };
      }

      // 2. Prepare filename & destination
      const safeTitle = sanitizeFilename(track.name);
      const safeArtist = sanitizeFilename(track.artist);
      const filename = `${safeTitle} - ${safeArtist}.mp3`;
      const targetDir = `${FileSystem.documentDirectory}Music/`;

      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      }

      const localFileUri = `${targetDir}${filename}`;

      // 3. Download file with progress callback
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localFileUri,
        {},
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const progress =
              downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            onProgress?.(Math.min(1, Math.max(0, progress)));
          }
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (!downloadResult || !downloadResult.uri) {
        return { success: false, error: 'Download failed to complete.' };
      }

      onProgress?.(1);

      let assetId: string | undefined;
      let publicPath: string | undefined;

      // 3.5 Download artwork if available for ID3 tag embedding
      let artworkLocalUri: string | undefined;
      const artworkUrl = track.image || (track as any).thumbnail || (track as any).artworkUrl;
      if (artworkUrl && typeof artworkUrl === 'string' && artworkUrl.startsWith('http')) {
        try {
          const tempArtPath = `${FileSystem.cacheDirectory}art_${safeTitle}_${Date.now()}.jpg`;
          const artResult = await FileSystem.downloadAsync(artworkUrl, tempArtPath);
          if (artResult?.uri) {
            artworkLocalUri = artResult.uri;
          }
        } catch (artErr) {
          console.warn('[DownloadService] Artwork cache warning:', artErr);
        }
      }

      // 4. Save to Android Public MediaStore & Music Storage via Native Module (with embedded ID3 cover art)
      if (Platform.OS === 'android' && MediaSaverModule?.saveAudioToPublicStorage) {
        try {
          const nativeRes = await MediaSaverModule.saveAudioToPublicStorage(
            downloadResult.uri,
            track.name,
            track.artist,
            track.album || 'DualEngine Music',
            artworkLocalUri || null,
            artworkUrl || null
          );
          if (nativeRes?.publicPath) {
            publicPath = nativeRes.publicPath;
          }
          if (nativeRes?.contentUri) {
            assetId = nativeRes.contentUri;
          }
          console.log('[DownloadService] Successfully saved to Android public media store & gallery with cover art:', nativeRes);
        } catch (nativeErr) {
          console.warn('[DownloadService] Native MediaSaver error, attempting decoded fallback:', nativeErr);
          try {
            const decodedUri = decodeURIComponent(downloadResult.uri);
            const nativeRes = await MediaSaverModule.saveAudioToPublicStorage(
              decodedUri,
              track.name,
              track.artist,
              track.album || 'DualEngine Music',
              artworkLocalUri || null,
              artworkUrl || null
            );
            if (nativeRes?.publicPath) publicPath = nativeRes.publicPath;
            if (nativeRes?.contentUri) assetId = nativeRes.contentUri;
            console.log('[DownloadService] Saved via decoded URI with cover art:', nativeRes);
          } catch (retryErr) {
            console.warn('[DownloadService] MediaSaver retry error:', retryErr);
          }
        }

        // Clean up temporary artwork file
        if (artworkLocalUri) {
          FileSystem.deleteAsync(artworkLocalUri, { idempotent: true }).catch(() => {});
        }
      }

      // 5. Fallback or cross-platform MediaLibrary indexing
      if (!publicPath) {
        try {
          const hasPermission = await this.requestPermissions();
          if (hasPermission) {
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            assetId = asset?.id || assetId;

            const album = await MediaLibrary.getAlbumAsync('DualEngine Music');
            if (album === null) {
              await MediaLibrary.createAlbumAsync('DualEngine Music', asset, false);
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            }
          }
        } catch (mediaErr) {
          console.warn('[DownloadService] MediaLibrary fallback save warning:', mediaErr);
        }
      }

      return {
        success: true,
        localUri: downloadResult.uri,
        publicPath,
        assetId,
      };
    } catch (err: any) {
      console.error('[DownloadService] Download error:', err);
      return {
        success: false,
        error: err?.message || 'An unexpected error occurred during download.',
      };
    }
  }

  /**
   * Downloads and trims an audio snippet (cut range) directly to the phone's music library
   */
  async downloadCutTrack(
    track: Track,
    startSec: number,
    endSec: number,
    preferredQuality: AudioQuality = '320kbps',
    onProgress?: (progress: number) => void
  ): Promise<DownloadResult> {
    try {
      // 1. Resolve direct stream URL
      const downloadUrl = await this.resolveDownloadUrl(track, preferredQuality);
      if (!downloadUrl) {
        return {
          success: false,
          error: 'Could not resolve a downloadable audio stream for this track.',
        };
      }

      // 2. Download source audio file to temporary cache
      const safeTitle = sanitizeFilename(track.name);
      const safeArtist = sanitizeFilename(track.artist);
      const tempCacheUri = `${FileSystem.cacheDirectory}raw_${Date.now()}_${safeTitle}.mp3`;

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        tempCacheUri,
        {},
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const progress =
              (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 0.75;
            onProgress?.(progress);
          }
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (!downloadResult || !downloadResult.uri) {
        return { success: false, error: 'Could not download source track for trimming.' };
      }

      onProgress?.(0.85);

      // 3. Cache artwork for ID3 embedding
      let artworkLocalUri: string | undefined;
      const artworkUrl = track.image || (track as any).thumbnail || (track as any).artworkUrl;
      if (artworkUrl && typeof artworkUrl === 'string' && artworkUrl.startsWith('http')) {
        try {
          const tempArtPath = `${FileSystem.cacheDirectory}art_${safeTitle}_${Date.now()}.jpg`;
          const artResult = await FileSystem.downloadAsync(artworkUrl, tempArtPath);
          if (artResult?.uri) {
            artworkLocalUri = artResult.uri;
          }
        } catch (artErr) {
          console.warn('[DownloadService] Artwork cache error:', artErr);
        }
      }

      let assetId: string | undefined;
      let publicPath: string | undefined;

      // 4. Native Lossless Trimmer via MediaSaverModule
      if (Platform.OS === 'android' && MediaSaverModule?.trimAndSaveAudioToPublicStorage) {
        try {
          const nativeRes = await MediaSaverModule.trimAndSaveAudioToPublicStorage(
            downloadResult.uri,
            startSec * 1000,
            endSec * 1000,
            track.name,
            track.artist,
            track.album || 'DualEngine Music',
            artworkLocalUri || null,
            artworkUrl || null
          );
          if (nativeRes?.publicPath) publicPath = nativeRes.publicPath;
          if (nativeRes?.contentUri) assetId = nativeRes.contentUri;
          console.log('[DownloadService] Trimmed and saved snippet successfully:', nativeRes);
        } catch (trimErr) {
          console.warn('[DownloadService] Native trim failed, falling back to full save:', trimErr);
          const fallbackRes = await MediaSaverModule.saveAudioToPublicStorage(
            downloadResult.uri,
            `${track.name} (Snippet)`,
            track.artist,
            track.album || 'DualEngine Music',
            artworkLocalUri || null,
            artworkUrl || null
          );
          if (fallbackRes?.publicPath) publicPath = fallbackRes.publicPath;
          if (fallbackRes?.contentUri) assetId = fallbackRes.contentUri;
        }
      } else {
        // Fallback save to MediaLibrary
        try {
          const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
          assetId = asset?.id;
          const album = await MediaLibrary.getAlbumAsync('DualEngine Music');
          if (album === null) {
            await MediaLibrary.createAlbumAsync('DualEngine Music', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (e) {}
      }

      // Cleanup temp raw audio & artwork
      FileSystem.deleteAsync(tempCacheUri, { idempotent: true }).catch(() => {});
      if (artworkLocalUri) {
        FileSystem.deleteAsync(artworkLocalUri, { idempotent: true }).catch(() => {});
      }

      onProgress?.(1.0);

      return {
        success: true,
        localUri: downloadResult.uri,
        publicPath,
        assetId,
      };
    } catch (err: any) {
      console.error('[DownloadService] Cut download error:', err);
      return {
        success: false,
        error: err?.message || 'Failed to download and trim audio snippet.',
      };
    }
  }
}

export const downloadService = new DownloadService();
