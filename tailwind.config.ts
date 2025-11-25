import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'nouvie': {
          'blue': '#0440a5',
          'turquoise': '#33ccd4',
          'light-blue': '#547cc1',
          'pale-blue': '#acbfe1',
          'navy': '#052d86',
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      boxShadow: {
        'nouvie': '0 2px 8px rgba(4, 64, 165, 0.1)',
        'nouvie-lg': '0 4px 16px rgba(4, 64, 165, 0.15)',
      },
      borderRadius: {
        'nouvie': '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;