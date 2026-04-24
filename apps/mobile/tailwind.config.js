/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      spacing: {
        xs: "6px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "40px",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "20px",
        xl: "24px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
