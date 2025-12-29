import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Importante para forzar el modo oscuro
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Aquí podrías agregar colores personalizados si quisieras
    },
  },
  plugins: [],
};
export default config;