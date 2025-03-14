import React from 'react';
import { render } from '@testing-library/react';
import ChatInterface from '../app/components/ChatInterface';
import { vi, describe, test, expect } from 'vitest';
import type { ChatState } from '../app/types/chat';
import { mockChatStateProps } from './mockData';

/**
 * Tests for the ChatInterface component
 * This file verifies the fix for the 'input is not defined' error in ChatInterface.tsx
 */

// Mock the useFireproof hook
vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    database: {},
    useLiveQuery: () => ({ docs: [] }),
  }),
}));

// Prepare mock data
const mockChatState: ChatState = {
  ...mockChatStateProps,
  docs: [],
  input: '',
  setInput: vi.fn(),
  isStreaming: false,
  inputRef: { current: null },
  sendMessage: vi.fn(),
  title: 'test title',
  sessionId: 'test-session-id',
  selectedResponseDoc: undefined,
  selectedSegments: [],
  selectedCode: {
    type: 'code',
    content: 'console.log("test")',
  },
  selectedDependencies: {},
  codeReady: false,
  addScreenshot: () => Promise.resolve(),
  setSelectedResponseId: vi.fn(),
};

describe('ChatInterface', () => {
  test('renders without error after fixing input destructuring', () => {
    // This test passes now that we've fixed the 'input is not defined' error
    // by properly destructuring input from chatState
    const { container } = render(
      <ChatInterface 
        {...mockChatState} 
        isSidebarVisible={false}
        setIsSidebarVisible={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
