import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { useEffect, memo, useCallback } from 'react';
import VibesDIYLogo from './VibesDIYLogo';

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

function ChatInput({ value, onChange, onSend, onKeyDown, disabled, inputRef }: ChatInputProps) {
  // Auto-resize textarea function
  const autoResizeTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 200;
      const minHeight = 90;
      textarea.style.height = `${Math.max(minHeight, Math.min(maxHeight, textarea.scrollHeight))}px`;
    }
  }, [inputRef]);

  // Initial auto-resize
  useEffect(() => {
    autoResizeTextarea();
  }, [value, autoResizeTextarea]);

  return (
    <div className="px-4 py-2">
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-01 dark:bg-dark-background-01 focus:ring-accent-01-light dark:focus:ring-accent-01-dark max-h-[200px] min-h-[90px] w-full resize-y rounded-xl border p-2.5 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder={'I want to build...'}
          disabled={disabled}
          rows={2}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className={`light-gradient border-glimmer absolute flex items-center justify-center overflow-hidden rounded-xl border shadow-sm transition-all duration-300 hover:border-gray-300 hover:shadow-md active:shadow-inner dark:hover:border-gray-600 ${
            disabled
              ? 'border-gray-300 dark:border-gray-500'
              : 'border-gray-200 dark:border-gray-700'
          } right-0 bottom-0 -mr-2 -mb-1 w-[110px] px-1 py-2`}
          style={{
            backdropFilter: 'blur(1px)',
          }}
          aria-label={disabled ? 'Generating' : 'Send message'}
        >
          <div className="relative z-10">
            <VibesDIYLogo />
          </div>
        </button>
      </div>
    </div>
  );
}

// Use memo to optimize rendering
export default memo(ChatInput);
