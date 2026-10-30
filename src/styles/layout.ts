import { css, styled } from 'styled-components'
import { Link } from 'wouter'

/** 页面框架：header / 内容区 / footer。 */

export const Page = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`

export const Content = styled.main`
  flex-grow: 1;
`

export const HeaderBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 7vw;
  background-color: var(--header-bg);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--line);

  @media (max-width: 960px) {
    flex-wrap: wrap;
    gap: 16px;
  }
`

export const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
`

export const BrandMark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0b0d12;
  font-weight: 700;
`

export const BrandText = styled.span`
  display: flex;
  flex-direction: column;
  font-weight: 600;
`

export const BrandSub = styled.span`
  font-size: 0.78rem;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

export const Nav = styled.nav<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 0.95rem;
  margin-left: auto;
  justify-content: flex-end;

  /* 窄屏：默认收起，展开后纵向排列在「品牌 + 操作按钮」行下方 */
  @media (max-width: 960px) {
    ${({ $open }) =>
      $open
        ? css`
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
            gap: 12px;
            order: 2;
          `
        : css`
            display: none;
            order: 2;
          `}
  }
`

const navLinkCss = css`
  color: var(--text-muted);
  transition: color 0.2s ease;

  &:hover {
    color: var(--text);
  }
`

export const NavLink = styled(Link)`
  ${navLinkCss}
`

export const NavAnchor = styled.a`
  ${navLinkCss}
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 960px) {
    order: 1;
  }
`

export const ThemeButton = styled.button<{ $placement: 'nav' | 'mobile' }>`
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  background-color: transparent;
  border: 1px solid var(--line);
  color: var(--text);

  ${({ $placement }) =>
    $placement === 'nav'
      ? css`
          display: inline-flex;

          @media (max-width: 960px) {
            display: none;
          }
        `
      : css`
          display: none;

          @media (max-width: 960px) {
            display: inline-flex;
          }
        `}
`

export const NavToggle = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 999px;
  background-color: transparent;
  border: 1px solid var(--line);
  color: var(--text);

  @media (max-width: 960px) {
    display: inline-flex;
  }
`

/** 图标统一尺寸（header 里的主题 / 菜单图标，以及被 styled 包装的 SVG）。 */
export const iconCss = css`
  width: 18px;
  height: 18px;
  display: block;
`

export const FooterBar = styled.footer`
  margin-top: 80px;
  padding: 48px 7vw 60px;
  border-top: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 16px;

  & h3 {
    font-size: 1.8rem;
    margin-bottom: 8px;
  }
`

export const FooterMeta = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--text-muted);
  font-size: 0.9rem;
`
