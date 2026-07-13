import type { LucideIcon } from 'lucide-react'

type SectionHeaderProps = {
  id: string
  step: string
  title: string
  meta: string
  icon: LucideIcon
}

export function SectionHeader({ id, step, title, meta, icon: Icon }: SectionHeaderProps) {
  return (
    <div className="section-heading">
      <h2 id={id} className="section-pill">
        <Icon aria-hidden="true" />
        <span>{step}</span>
        {title}
      </h2>
      <span className="section-line" aria-hidden="true" />
      <span className="section-meta">{meta}</span>
    </div>
  )
}
