import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // IMPORTANTE: 'class' evita que tu PC fuerce el modo oscuro
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wuotto: {
          DEFAULT: "#00C897",
          hover: "#00b386",
        },
        background: "#F0F4F8",
      },
    },
  },
  plugins: [],
};
export default config;