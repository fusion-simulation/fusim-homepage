import { css, styled } from 'styled-components'
import { Link } from 'wouter'
import { container, containers, fromContainer } from './responsive'

/** 页面框架：header / 内容区 / footer。 */

export const Page = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`

export const Content = styled.main`
  flex-grow: 1;
`

/**
 * 顶部导航：`fixed` 贴住视口顶端（不再占用文档流高度，首屏才能铺满一屏）。
 * 页面停在最上端时整条收起，向下滚动后滑出；收起时用 `visibility: hidden`
 * 一并移出 Tab 焦点序列，过渡结束后才真正隐藏。
 */
export const HeaderBar = styled.header<{ $hidden: boolean }>`
  ${container(containers.siteHeader)}
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 14px 4vw;
  background-color: var(--header-bg);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border-bottom: 1px solid var(--line);
  transform: translateY(${({ $hidden }) => ($hidden ? '-100%' : '0')});
  visibility: ${({ $hidden }) => ($hidden ? 'hidden' : 'visible')};
  transition:
    transform 0.32s ease,
    visibility 0.32s ease;

  /* 底部等离子体渐变发丝线 */
  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 1px;
    background: linear-gradient(90deg, transparent 5%, var(--accent) 30%, var(--accent-deep) 55%, transparent 90%);
    opacity: 0.55;
    pointer-events: none;
  }

`

/**
 * 页头内容行：flex 布局放在容器内部，宽页头的 `nowrap` 才真的生效
 * （元素不是自己的查询容器，写在 HeaderBar 里会变成一段永不匹配的 CSS）。
 */
export const HeaderBarInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 窄页头：品牌行与导航自动分行 */
  flex-wrap: wrap;
  gap: 16px;

  ${fromContainer(containers.siteHeader, 'split')} {
    flex-wrap: nowrap;
    gap: 0;
  }
`

export const Brand = styled(Link)`
  display: flex;
  align-items: center;
`

/**
 * 品牌横板 Logo（环形标志 + 中英文公司名）。
 * 源文件是单色描图稿，用遮罩染成正文色：暗色主题反白、亮色主题回墨色。
 */
export const BrandLogo = styled.span`
  display: inline-block;
  height: 38px;
  aspect-ratio: 1469 / 466;
  background-color: var(--text);
  filter: drop-shadow(0 0 12px rgba(var(--accent-rgb), 0.18));
  -webkit-mask-image: url('/logos/fusim-logo.svg');
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  mask-image: url('/logos/fusim-logo.svg');
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
`

export const Nav = styled.nav<{ $open: boolean }>`
  font-size: 0.93rem;
  margin-left: auto;
  justify-content: flex-end;

  /* 窄页头：默认收起，展开后纵向排列在「品牌 + 操作按钮」行下方 */
  ${({ $open }) =>
    $open
      ? css`
          display: flex;
          flex-direction: column;
          align-items: stretch;
          width: 100%;
          gap: 6px;
          order: 2;
          padding: 10px 4px 16px;
          border-top: 1px solid var(--line);
        `
      : css`
          display: none;
          order: 2;
        `}

  ${fromContainer(containers.siteHeader, 'split')} {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: auto;
    gap: 24px;
    order: 0;
    padding: 0;
    border-top: 0;
  }
`

const navLinkCss = css<{ $active?: boolean }>`
  position: relative;
  padding: 10px 4px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: ${({ $active }) => ($active ? 'var(--text)' : 'var(--text-muted)')};
  transition: color 0.2s ease;

  /* 悬停/激活时浮现的下划线（窄页头里不显示，避免与分隔线打架） */
  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    display: none;
    background: linear-gradient(90deg, var(--accent), var(--accent-deep));
    transform: scaleX(${({ $active }) => ($active ? 1 : 0)});
    transform-origin: left;
    transition: transform 0.25s ease;
  }

  &:hover {
    color: var(--text);
  }

  &:hover::after {
    transform: scaleX(1);
  }

  ${fromContainer(containers.siteHeader, 'split')} {
    padding: 6px 2px;

    &::after {
      display: block;
    }
  }
`

export const NavLink = styled(Link)<{ $active?: boolean }>`
  ${navLinkCss}
`

export const NavAnchor = styled.a<{ $active?: boolean }>`
  ${navLinkCss}
`

/** 导航尾部 CTA：细描边胶囊，悬停点亮。 */
export const NavCta = styled.a`
  padding: 9px 18px;
  border: 1px solid var(--line-strong);
  color: var(--text);
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  background: var(--surface-translucent);
  margin-top: 10px;
  text-align: center;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;

  &:hover {
    border-color: var(--accent);
    color: var(--accent-ink);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  }

  ${fromContainer(containers.siteHeader, 'split')} {
    margin-top: 0;
    text-align: left;
  }
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  order: 1;

  ${fromContainer(containers.siteHeader, 'split')} {
    order: 0;
  }
`

const roundButtonCss = css`
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  background-color: var(--surface-translucent);
  border: 1px solid var(--line);
  color: var(--text);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;

  &:hover {
    border-color: var(--line-strong);
    color: var(--accent-ink);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }
`

export const ThemeButton = styled.button<{ $placement: 'nav' | 'mobile' }>`
  ${roundButtonCss}
  font-size: 0.85rem;
  /* 窄页头把主题按钮收进操作区，宽页头放回导航尾部 */
  display: ${({ $placement }) => ($placement === 'nav' ? 'none' : 'inline-flex')};

  ${fromContainer(containers.siteHeader, 'split')} {
    display: ${({ $placement }) => ($placement === 'nav' ? 'inline-flex' : 'none')};
  }
`

export const NavToggle = styled.button`
  ${roundButtonCss}
  display: inline-flex;

  ${fromContainer(containers.siteHeader, 'split')} {
    display: none;
  }
`

/** 图标统一尺寸（header 里的主题 / 菜单图标，以及被 styled 包装的 SVG）。 */
export const iconCss = css`
  width: 18px;
  height: 18px;
  display: block;
`

/* ---------- Footer：多列站点地图 ---------- */

export const FooterBar = styled.footer`
  ${container(containers.siteFooter)}
  position: relative;
  margin-top: 0;
  padding: 72px 7vw 48px;
  border-top: 1px solid var(--line);
  background:
    radial-gradient(720px 300px at 20% 0%, rgba(var(--accent-rgb), 0.05), transparent 65%),
    var(--bg-deep);

  /* 顶部等离子体发丝线 */
  &::before {
    content: "";
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent 5%, var(--accent) 35%, var(--accent-deep) 60%, transparent 95%);
    opacity: 0.5;
    pointer-events: none;
  }
`

export const FooterGrid = styled.div`
  max-width: var(--max-width);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;

  ${fromContainer(containers.siteFooter, 'actions')} {
    grid-template-columns: 1fr 1fr;
  }

  ${fromContainer(containers.siteFooter, 'split')} {
    grid-template-columns: 1.6fr 1fr 1fr 1.2fr;
  }
`

export const FooterBrandCol = styled.div`
  display: grid;
  gap: 16px;
  align-content: start;

  & p {
    color: var(--text-muted);
    line-height: 1.8;
    font-size: 0.95rem;
    max-width: 320px;
  }

  & a {
    color: var(--accent-ink);
    font-weight: 500;

    &:hover {
      text-shadow: 0 0 18px rgba(var(--accent-rgb), 0.55);
    }
  }
`

/** 页脚全称横板 Logo：环形标志 + 公司全称中英文，遮罩染色方式与 BrandLogo 相同。 */
export const FooterLogo = styled.span`
  display: inline-block;
  height: 36px;
  aspect-ratio: 2919 / 508;
  background-color: var(--text);
  filter: drop-shadow(0 0 10px rgba(var(--accent-rgb), 0.18));
  -webkit-mask-image: url('/logos/fusim-logo-full.svg');
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  mask-image: url('/logos/fusim-logo-full.svg');
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
`

export const FooterCol = styled.nav`
  display: grid;
  gap: 12px;
  align-content: start;

  & h4 {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.26em;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  & a {
    color: var(--text-muted);
    font-size: 0.95rem;
    width: fit-content;
    transition:
      color 0.2s ease,
      text-shadow 0.2s ease;

    &:hover {
      color: var(--accent-ink);
      text-shadow: 0 0 16px rgba(var(--accent-rgb), 0.4);
    }
  }
`

export const FooterBottom = styled.div`
  max-width: var(--max-width);
  margin: 56px auto 0;
  padding-top: 24px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  color: var(--text-muted);
  font-size: 0.85rem;

  & a {
    color: var(--text-muted);

    &:hover {
      color: var(--accent-ink);
    }
  }

  /* 底行靠 flex wrapping 换行，不再需要视口断点 */
  & span:last-child {
    margin-left: auto;
  }
`
