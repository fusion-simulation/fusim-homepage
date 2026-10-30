import { createGlobalStyle } from 'styled-components'

/**
 * 全局样式：CSS 变量（含暗色主题覆盖）、重置、body 与链接默认值。
 *
 * 颜色仍走 `var(--*)`：`index.html` 的内联脚本会在 React 启动前把 `data-theme`
 * 写到 `<html>` 上，用 CSS 变量比 ThemeProvider 更早生效、也不会闪主题。
 */
export const GlobalStyle = createGlobalStyle`
  :root {
    --bg: #f7f8fb;
    --bg-soft: #ffffff;
    --bg-card: #ffffff;
    --accent: #3f6df6;
    --accent-2: #4fd1c5;
    --text: #1e2432;
    --text-muted: #5b667a;
    --line: rgba(30, 36, 50, 0.12);
    --radius-lg: 16px;
    --radius-md: 10px;
    --radius-sm: 6px;
    --shadow: 0 32px 80px rgba(30, 36, 50, 0.12);
    --max-width: 1200px;

    /* 原站点中用 \`html[data-theme="dark"] xxx\` 单独覆盖的颜色，改为变量 */
    --header-bg: rgba(247, 248, 251, 0.75);
    --surface-translucent: rgba(255, 255, 255, 0.6);
    --bar: rgba(30, 36, 50, 0.12);
    --dot: rgba(30, 36, 50, 0.2);
    --metric-bg: rgba(63, 109, 246, 0.08);
    --metric-border: rgba(63, 109, 246, 0.2);
    --prose-shadow: 0 18px 50px rgba(30, 36, 50, 0.08);

    --font-sans: "Space Grotesk", system-ui, sans-serif;
    --font-serif: "Source Serif 4", serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }

  html[data-theme="dark"] {
    --bg: #0f1218;
    --bg-soft: #151a23;
    --bg-card: #161d29;
    --accent: #79a6ff;
    --accent-2: #5ee2d1;
    --text: #f5f7fb;
    --text-muted: #9aa4b5;
    --line: rgba(255, 255, 255, 0.1);
    --shadow: 0 40px 80px rgba(0, 0, 0, 0.5);

    --header-bg: rgba(15, 18, 24, 0.75);
    --surface-translucent: rgba(21, 26, 35, 0.6);
    --bar: rgba(255, 255, 255, 0.12);
    --dot: rgba(255, 255, 255, 0.2);
    --metric-bg: rgba(121, 166, 255, 0.12);
    --metric-border: rgba(121, 166, 255, 0.3);
    --prose-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: var(--font-sans);
    background:
      radial-gradient(circle at 12% 10%, rgba(63, 109, 246, 0.12), transparent 40%),
      radial-gradient(circle at 80% 18%, rgba(79, 209, 197, 0.14), transparent 45%),
      var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  /* 主题切换按钮的图标（深色主题下切换太阳 / 月亮） */
  html .theme-toggle-icon-dark {
    display: none;
  }

  html[data-theme="dark"] .theme-toggle-icon-dark {
    display: block;
  }

  html[data-theme="dark"] .theme-toggle-icon-light {
    display: none;
  }
`
