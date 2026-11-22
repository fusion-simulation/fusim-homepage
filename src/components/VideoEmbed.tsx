import { styled } from 'styled-components'

type VideoEmbedProps = {
  /** iframe 播放器地址。 */
  src: string
  /** 无障碍标题（屏幕阅读器与无图环境使用）。 */
  title: string
}

const Frame = styled.div`
  position: relative;
  width: 100%;
  max-width: 960px;
  margin-inline: auto;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--line);
  background: #000;

  & iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
`

/** 正文视频：16:9 响应式外链播放器，避免 iframe 固定高度在窄屏溢出。 */
export function VideoEmbed({ src, title }: VideoEmbedProps) {
  return (
    <Frame>
      <iframe
        src={src}
        title={title}
        allowFullScreen
        scrolling="no"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </Frame>
  )
}
