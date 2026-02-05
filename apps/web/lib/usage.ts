"use client";

// Simple persistent usage tracker using localStorage
export interface VyonixStats {
    audio_files: number;
    audio_seconds: number;
    images_processed: number;
    images_generated: number;
    words_processed: number;
    tokens_input: number;
    tokens_output: number;
    last_updated: string;
}

const DEFAULT_STATS: VyonixStats = {
    audio_files: 0,
    audio_seconds: 0,
    images_processed: 0,
    images_generated: 0,
    words_processed: 0,
    tokens_input: 0,
    tokens_output: 0,
    last_updated: new Date().toISOString()
};

const STORAGE_KEY = 'vyonix_usage_metrics';

export const getStats = (): VyonixStats => {
    if (typeof window === 'undefined') return DEFAULT_STATS;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATS;
    try {
        return JSON.parse(stored);
    } catch {
        return DEFAULT_STATS;
    }
};

export const trackUsage = (delta: Partial<VyonixStats>) => {
    if (typeof window === 'undefined') return;
    const current = getStats();
    const updated: VyonixStats = {
        ...current,
        audio_files: current.audio_files + (delta.audio_files || 0),
        audio_seconds: current.audio_seconds + (delta.audio_seconds || 0),
        images_processed: current.images_processed + (delta.images_processed || 0),
        images_generated: current.images_generated + (delta.images_generated || 0),
        words_processed: current.words_processed + (delta.words_processed || 0),
        tokens_input: current.tokens_input + (delta.tokens_input || 0),
        tokens_output: current.tokens_output + (delta.tokens_output || 0),
        last_updated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch event for other components to listen
    window.dispatchEvent(new Event('usage-updated'));
};
