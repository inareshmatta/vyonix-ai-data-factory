'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define types for each studio's state
interface AudioStudioState {
    files: File[];
    transcriptions: any[];
    currentFileIndex: number;
}

interface VisionStudioState {
    images: { file: File; src: string }[];
    annotations: any[];
    currentImageIndex: number;
}

interface VideoStudioState {
    videoFile: File | null;
    videoSrc: string | null;
    annotations: any[];
    transcripts: any[];
    generatedVideos: string[];
}

interface NLPStudioState {
    documents: { file: File; text: string }[];
    entities: any[];
    currentDocIndex: number;
}

interface StudioState {
    audio: AudioStudioState;
    vision: VisionStudioState;
    video: VideoStudioState;
    nlp: NLPStudioState;
}

interface StudioStateContextType {
    state: StudioState;
    setAudioState: (state: Partial<AudioStudioState>) => void;
    setVisionState: (state: Partial<VisionStudioState>) => void;
    setVideoState: (state: Partial<VideoStudioState>) => void;
    setNLPState: (state: Partial<NLPStudioState>) => void;
    resetAll: () => void;
}

const defaultState: StudioState = {
    audio: { files: [], transcriptions: [], currentFileIndex: 0 },
    vision: { images: [], annotations: [], currentImageIndex: 0 },
    video: { videoFile: null, videoSrc: null, annotations: [], transcripts: [], generatedVideos: [] },
    nlp: { documents: [], entities: [], currentDocIndex: 0 }
};

const StudioStateContext = createContext<StudioStateContextType | undefined>(undefined);

export function StudioStateProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<StudioState>(defaultState);

    const setAudioState = (newState: Partial<AudioStudioState>) => {
        setState(prev => ({ ...prev, audio: { ...prev.audio, ...newState } }));
    };

    const setVisionState = (newState: Partial<VisionStudioState>) => {
        setState(prev => ({ ...prev, vision: { ...prev.vision, ...newState } }));
    };

    const setVideoState = (newState: Partial<VideoStudioState>) => {
        setState(prev => ({ ...prev, video: { ...prev.video, ...newState } }));
    };

    const setNLPState = (newState: Partial<NLPStudioState>) => {
        setState(prev => ({ ...prev, nlp: { ...prev.nlp, ...newState } }));
    };

    const resetAll = () => setState(defaultState);

    return (
        <StudioStateContext.Provider value={{ state, setAudioState, setVisionState, setVideoState, setNLPState, resetAll }}>
            {children}
        </StudioStateContext.Provider>
    );
}

export function useStudioState() {
    const context = useContext(StudioStateContext);
    if (!context) {
        throw new Error('useStudioState must be used within a StudioStateProvider');
    }
    return context;
}
