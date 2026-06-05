/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "stitch-purple": "#aa3bff",
        "stitch-purple-light": "rgba(170, 59, 255, 0.1)",
        honey: "#fbbf24",
        "honey-deep": "#f59e0b",
      },
      animation: {
        "gradient-shift": "gradient-shift 15s ease infinite",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};
