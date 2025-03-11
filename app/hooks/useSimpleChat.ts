import { useState, useRef, useCallback, useEffect } from 'react';
import type { ChatMessage, UserChatMessage, AiChatMessage, Segment } from '../types/chat';
import { makeBaseSystemPrompt } from '../prompts';

const CHOSEN_MODEL = 'anthropic/claude-3.7-sonnet';

/**
 * Parse content into segments of markdown and code
 * This is a pure function that doesn't rely on any state
 */
function parseContent(text: string): { segments: Segment[], dependenciesString: string | undefined } {
  const segments: Segment[] = [];
  let dependenciesString: string | undefined;

  // Extract dependencies from the first segment (if it exists)
  const depsMatch = text.match(/^(.*}})/s);
  if (depsMatch && depsMatch[1]) {
    dependenciesString = depsMatch[1];
    // Remove the dependencies part from the text
    text = text.slice(depsMatch[1].length);
  }

  // Split by code blocks (```...)
  const parts = text.split(/```(?:[^\n]*\n)?/);
  
  if (parts.length === 1) {
    // No code blocks found, just markdown
    segments.push({
      type: 'markdown',
      content: parts[0]
    });
  } else {
    // We have code blocks
    parts.forEach((part, index) => {
      if (index % 2 === 0) {
        // Even indices are markdown
        if (part.trim()) {
          segments.push({
            type: 'markdown',
            content: part
          });
        }
      } else {
        // Odd indices are code
        segments.push({
          type: 'code',
          content: part
        });
      }
    });
  }

  return { segments, dependenciesString };
}

/**
 * Simplified chat hook that focuses on data-driven state management
 */
export function useSimpleChat(
  onCodeGenerated: (code: string, dependencies?: Record<string, string>) => void,
  onGeneratedTitle?: (title: string) => void
) {
  // Core state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  
  // Refs for tracking streaming state
  const streamBufferRef = useRef<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize system prompt
  useEffect(() => {
    makeBaseSystemPrompt(CHOSEN_MODEL).then((prompt) => {
      setSystemPrompt(prompt);
    });
  }, []);

  // Auto-resize textarea function
  const autoResizeTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Function to build conversation history for the prompt
  function buildMessageHistory() {
    return messages.map((msg) => ({
      role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.text,
    }));
  }

  /**
   * Extract dependencies as a Record from the dependencies string
   */
  function parseDependencies(dependenciesString?: string): Record<string, string> {
    if (!dependenciesString) return {};
    
    const dependencies: Record<string, string> = {};
    const matches = dependenciesString.match(/"([^"]+)"\s*:\s*"([^"]+)"/g);
    
    if (matches) {
      matches.forEach((match) => {
        const keyMatch = match.match(/"([^"]+)"\s*:/);
        const valueMatch = match.match(/:\s*"([^"]+)"/);
        
        if (keyMatch?.[1] && valueMatch?.[1]) {
          const key = keyMatch[1].trim();
          const value = valueMatch[1].trim();
          
          if (key && value) {
            dependencies[key] = value;
          }
        }
      });
    }
    
    return dependencies;
  }

  /**
   * Get current segments from the last AI message or the streaming buffer
   */
  const currentSegments = useCallback((): Segment[] => {
    // Find the last AI message
    const lastAiMessage = [...messages].reverse().find(
      (msg): msg is AiChatMessage => msg.type === 'ai'
    );
    
    // If there's a streaming message, parse the current buffer
    if (lastAiMessage?.isStreaming) {
      const { segments } = parseContent(streamBufferRef.current);
      return segments;
    }
    
    // Otherwise return segments from the last complete AI message
    return lastAiMessage?.segments || [];
  }, [messages]);

  /**
   * Get the code from the current segments
   */
  const getCurrentCode = useCallback((): string => {
    const segments = currentSegments();
    const codeSegment = segments.find(segment => segment.type === 'code');
    return codeSegment?.content || '';
  }, [currentSegments]);

  /**
   * Send a message and process the AI response
   */
  async function sendMessage() {
    if (input.trim()) {
      // Reset state for new message
      streamBufferRef.current = '';
      setIsGenerating(true);

      try {
        // Add user message
        const userMessage: UserChatMessage = { 
          type: 'user', 
          text: input,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Create placeholder AI message
        const placeholderAiMessage: AiChatMessage = {
          type: 'ai',
          text: '',
          segments: [],
          isStreaming: true,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, placeholderAiMessage]);
        
        // Clear input
        setInput('');

        // Build message history
        const messageHistory = buildMessageHistory();

        // Call OpenRouter API with streaming enabled
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Fireproof App Builder',
          },
          body: JSON.stringify({
            model: CHOSEN_MODEL,
            stream: true,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              ...messageHistory,
              {
                role: 'user',
                content: input,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();

        // Process the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });

          // Process each line (each SSE event)
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.choices && data.choices[0]?.delta?.content) {
                  const content = data.choices[0].delta.content;

                  // Add to stream buffer
                  streamBufferRef.current += content;

                  // Parse current buffer for AI message update
                  const { segments, dependenciesString } = parseContent(streamBufferRef.current);
                  
                  // Update the AI message
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    
                    if (lastIndex >= 0 && updated[lastIndex].type === 'ai') {
                      updated[lastIndex] = {
                        ...updated[lastIndex] as AiChatMessage,
                        text: streamBufferRef.current,
                        segments,
                        dependenciesString,
                        isStreaming: true
                      };
                    }
                    
                    return updated;
                  });
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }

        // Streaming is done, finalize the AI message
        const { segments, dependenciesString } = parseContent(streamBufferRef.current);
        const dependencies = parseDependencies(dependenciesString);
        
        // Find code segment if any
        const codeSegment = segments.find(segment => segment.type === 'code');
        const code = codeSegment?.content || '';
        
        // Update the final AI message
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          
          if (lastIndex >= 0 && updated[lastIndex].type === 'ai') {
            updated[lastIndex] = {
              ...updated[lastIndex] as AiChatMessage,
              text: streamBufferRef.current,
              segments,
              dependenciesString,
              isStreaming: false
            };
          }
          
          return updated;
        });

        // Execute callback with generated code if available
        if (code) {
          onCodeGenerated(code, dependencies);
        }

        // Generate a title if needed
        if (onGeneratedTitle) {
          try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Fireproof App Builder',
              },
              body: JSON.stringify({
                model: CHOSEN_MODEL,
                stream: false,
                messages: [
                  {
                    role: 'system',
                    content:
                      'You are a helpful assistant that generates short, descriptive titles. Create a concise title (3-5 words) that captures the essence of the content. Return only the title, no other text or markup.',
                  },
                  {
                    role: 'user',
                    content: `Generate a short, descriptive title (3-5 words) for this app, use the React JSX <h1> tag's value if you can find it:\n\n${streamBufferRef.current}`,
                  },
                ],
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const title = data.choices[0]?.message?.content?.trim() || 'New Chat';
              onGeneratedTitle(title);
            } else {
              onGeneratedTitle('New Chat');
            }
          } catch (error) {
            console.error('Error generating title:', error);
            onGeneratedTitle('New Chat');
          }
        }
      } catch (error) {
        // Handle errors
        setMessages(prev => [
          ...prev,
          {
            type: 'ai',
            text: 'Sorry, there was an error generating the component. Please try again.',
            segments: [
              {
                type: 'markdown',
                content: 'Sorry, there was an error generating the component. Please try again.'
              }
            ]
          } as AiChatMessage
        ]);
        console.error('Error calling OpenRouter API:', error);
      } finally {
        setIsGenerating(false);
      }
    }
  }

  return {
    messages,             // All messages in the conversation
    setMessages,          // Function to update messages
    input,                // Current user input text
    setInput,             // Function to update input
    isGenerating,         // Whether a message is being generated
    sendMessage,          // Function to send a message
    currentSegments,      // Get current segments
    getCurrentCode,       // Get current code
    inputRef,             // Reference to the input textarea
    messagesEndRef,       // Reference to the messages end div
    autoResizeTextarea,   // Function to resize textarea
    scrollToBottom,       // Function to scroll to bottom
  };
} 