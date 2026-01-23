import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Session, Point } from '../types';

interface SessionState {
  sessions: Session[];
  currentSession: Session | null;
  currentTranscript: string;
  currentPointText: string;
  isRecording: boolean;

  // Actions
  startNewSession: (name?: string) => void;
  loadSession: (id: string) => void;
  appendTranscript: (text: string) => void;
  setPointText: (text: string) => void;
  appendPointText: (chunk: string) => void;
  addPoint: (sourceText: string, point: string) => void;
  setRecording: (recording: boolean) => void;
  setSessions: (sessions: Session[]) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  currentTranscript: '',
  currentPointText: '',
  isRecording: false,

  startNewSession: (name?: string) => {
    const defaultTitle = `세션 ${new Date().toLocaleString('ko-KR')}`;
    const newSession: Session = {
      id: uuid(),
      createdAt: new Date(),
      title: name?.trim() || defaultTitle,
      transcript: '',
      points: [],
    };
    set((state) => ({
      sessions: [newSession, ...state.sessions],
      currentSession: newSession,
      currentTranscript: '',
      currentPointText: '',
    }));
  },

  loadSession: (id: string) => {
    const session = get().sessions.find(s => s.id === id);
    if (session) {
      set({
        currentSession: session,
        currentTranscript: session.transcript,
        currentPointText: '',
      });
    }
  },

  appendTranscript: (text: string) => {
    set((state) => {
      if (!state.currentSession) {
        return { currentTranscript: state.currentTranscript + ' ' + text };
      }

      const updatedSession = {
        ...state.currentSession,
        transcript: state.currentSession.transcript + ' ' + text,
      };

      return {
        currentTranscript: state.currentTranscript + ' ' + text,
        currentSession: updatedSession,
        sessions: state.sessions.map((session) =>
          session.id === updatedSession.id ? updatedSession : session,
        ),
      };
    });
  },

  setPointText: (text: string) => {
    set({ currentPointText: text });
  },

  appendPointText: (chunk: string) => {
    set(state => ({
      currentPointText: state.currentPointText + chunk,
    }));
  },

  addPoint: (sourceText: string, point: string) => {
    const newPoint: Point = {
      id: uuid(),
      timestamp: new Date(),
      sourceText,
      point,
    };
    set((state) => {
      if (!state.currentSession) {
        return { currentPointText: '' };
      }

      const updatedSession = {
        ...state.currentSession,
        points: [...state.currentSession.points, newPoint],
      };

      return {
        currentPointText: '',
        currentSession: updatedSession,
        sessions: state.sessions.map((session) =>
          session.id === updatedSession.id ? updatedSession : session,
        ),
      };
    });
  },

  setRecording: (recording: boolean) => {
    set({ isRecording: recording });
  },

  setSessions: (sessions: Session[]) => {
    set({ sessions });
  },
}));
