import { PageHeader } from '../components/PageHeader'
import { site } from '../content/site'
import { BtnAnchor, ButtonRow, Card, CardGrid, Reveal, Section } from '../styles/shared'

/** 按咨询类型分组的联络入口：全部统一走 site.email，避免多处维护同一地址。 */
const CHANNELS = [
  {
    title: '业务合作',
    desc: '产品授权、联合研发与定制化仿真项目的商务洽谈。',
    subject: '业务合作咨询',
  },
  {
    title: '方案咨询',
    desc: '聚变装置仿真需求评估、算力与平台部署方案的技术沟通。',
    subject: '方案咨询',
  },
  {
    title: '媒体联络',
    desc: '采访、报道与新闻素材的对接。',
    subject: '媒体联络',
  },
]

export function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="预约合作"
        description="业务合作、方案咨询与媒体联络，欢迎与聚核智算聊聊。"
      />

      <Section id="contact-channels">
        <CardGrid>
          {CHANNELS.map((channel, index) => (
            <Card key={channel.title} $delay={index + 1}>
              <h4>{channel.title}</h4>
              <p>{channel.desc}</p>
              <ButtonRow>
                <BtnAnchor
                  $variant="secondary"
                  href={`mailto:${site.email}?subject=${encodeURIComponent(channel.subject)}`}
                >
                  发送邮件
                </BtnAnchor>
              </ButtonRow>
            </Card>
          ))}
        </CardGrid>

        <Reveal>
          <Card $delay={4}>
            <h4>直接联系</h4>
            <p>
              邮箱：<a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          </Card>
        </Reveal>
      </Section>
    </>
  )
}
