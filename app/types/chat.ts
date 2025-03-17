import type { DocTypes } from 'use-fireproof';
import type { GroupedSession } from '../hooks/sidebar/useSessionList';

// ===== Content Segment Types =====
export type Segment = {
  type: 'markdown' | 'code';
  content: string;
};

// ===== Document Types =====

export type BaseChatMessageDocument = {
  _id?: string;
  session_id: string;
  text: string;
  created_at: number;
};

export type UserChatMessageDocument = BaseChatMessageDocument & {
  type: 'user';
};

export type AiChatMessageDocument = BaseChatMessageDocument & {
  type: 'ai';
};

export type ChatMessageDocument = UserChatMessageDocument | AiChatMessageDocument;

/**
 * Base document interface with common properties
 */
export interface DocBase {
  _id: string;
}

/**
 * Document type for screenshot entries
 */
export interface ScreenshotDocument extends DocBase {
  type: 'screenshot';
  session_id: string;
  _files?: {
    screenshot: { file: () => Promise<File>; type: string };
  };
}

// Note: We already have a SessionDocument interface, so merged the properties
export interface SessionDocument extends DocTypes {
  _id?: string;
  type: 'session'; // Document type for Fireproof queries
  title?: string;
  created_at: number;
  favorite?: boolean; // Added favorite property for starring sessions
  messages?: Array<{
    text: string;
    type: 'user' | 'ai';
    code?: string;
    dependencies?: Record<string, string>;
  }>;
}

/**
 * Union type for documents returned by query
 */
export type SessionOrScreenshot = SessionDocument | ScreenshotDocument;

// ===== UI Enhanced Types =====
// Enhanced types with additional UI properties
export type ChatMessage = ChatMessageDocument & {
  text: string;
  timestamp?: number;
};

// User chat message type used in the UI
export type UserChatMessage = ChatMessage & {
  type: 'user';
};

// Enhanced AiChatMessage type with segments for structured display
export type AiChatMessage = ChatMessage & {
  type: 'ai';
  segments?: Segment[];
  isStreaming?: boolean;
  dependenciesString?: string;
};

// ===== Component Props =====
export interface ChatState {
  docs: ChatMessageDocument[];
  input: string;
  setInput: (input: string) => void;
  isStreaming: boolean;
  codeReady: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  sendMessage: () => Promise<void>;
  title: string;
  addScreenshot: (screenshot: string) => Promise<void>;
  sessionId?: string | null;
  setSelectedResponseId: (id: string) => void;
  selectedResponseDoc?: ChatMessageDocument;
  selectedSegments?: Segment[];
  selectedCode?: Segment;
  selectedDependencies?: Record<string, string>;
}

export interface ChatInterfaceProps {
  chatState: ChatState;
  sessionId?: string | null;
  onSessionCreated?: (newSessionId: string) => void;
}

/**
 * Props for the SessionSidebar component
 */
export interface SessionSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  sessionId: string;
}

export type { GroupedSession };
