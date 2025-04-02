interface QuickSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

function QuickSuggestions({ onSelectSuggestion }: QuickSuggestionsProps) {
  const suggestions = [
    {
      label: 'Todos',
      text: 'Create a todo app with freeform textarea entry, that sends the text to AI to create todo list items using json, and tag them into the selected list.',
    },
    {
      label: 'Legends',
      text: 'Chat with legends, results are streamed and then saved as a document with legend_id.',
    },
    {
      label: 'Drawing',
      text: 'Create a simple drawing app with a canvas where users can draw with different colors and save their drawings.',
    },
    {
      label: 'Calculator',
      text: 'Create a calculator app with basic arithmetic operations.',
    },
    {
      label: 'Photos',
      text: "Image auto-tagger app that automatically saves, analyzes, tags, and describes images, displaying them in a list view as soon as they're dropped on the page, adding tags and descriptions as they come back.",
    },
    {
      label: 'Quiz',
      text: "Trivia show that lets me pick a topic, and uses AI to make questions and judge answers.",
    },
    {
      label: 'Pomodoro',
      text: 'Create a pomodoro timer app with multiple timers work/break intervals and session tracking.',
    },
    {
      label: 'Playlist',
      text: 'I send messages and Ai responds with a playlist for me, with YouTube search links for each song.',
    },
    {
      label: 'Similarity',
      text: 'I make a list of 2 or 3 items and then ai expands the list from the example.',
    },
    {
      label: 'Scheduling',
      text: 'Two text areas, paste the availability for each person, and AI finds the best time to meet.',
    },
    {
      label: 'Wildcard',
      text: "Generate a wildcard app, something I wouldn't expect.",
    },
  ];

  return (
    <div className="px-4 py-1">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectSuggestion(suggestion.text)}
            className="bg-light-background-01 dark:bg-dark-background-01 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickSuggestions;
