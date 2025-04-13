'use client';

import { useTheme } from './ThemeProvider';

export default function DarkModeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      role="switch"
      aria-checked={isDarkMode}
    >
      <span className="sr-only">Toggle dark mode</span>
      <span
        className={`${
          isDarkMode ? 'translate-x-6 bg-gray-800' : 'translate-x-1 bg-gray-200'
        } inline-block h-4 w-4 transform rounded-full transition-transform`}
      />
      <span
        className={`${
          isDarkMode ? 'opacity-0' : 'opacity-100'
        } absolute left-1.5 text-yellow-500 transition-opacity`}
      >
        ☀️
      </span>
      <span
        className={`${
          isDarkMode ? 'opacity-100' : 'opacity-0'
        } absolute right-1.5 text-gray-300 transition-opacity`}
      >
        🌙
      </span>
    </button>
  );
} 