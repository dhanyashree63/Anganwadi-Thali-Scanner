/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: "#0f172a",
          slate: "#1e293b",
          emerald: "#15803d",
          amber: "#b45309",
          crimson: "#b91c1c",
        },
      },
    },
  },
  plugins: [],
};
