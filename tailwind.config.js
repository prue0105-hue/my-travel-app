/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ac-beige': '#F7F4EB', // 動森米色背景
        'ac-green': '#7BA05B', // 森林綠
        'ac-brown': '#8B5A2B', // 大地棕
        'ac-shadow': '#E0E5D5', // 軟陰影顏色
      },
      borderRadius: {
        'ac': '24px', // 圓潤的大圓角
      },
      boxShadow: {
        'soft-ac': '4px 4px 0px 0px #E0E5D5', // 你要求的硬邊軟陰影
      }
    },
  },
  plugins: [],
}
