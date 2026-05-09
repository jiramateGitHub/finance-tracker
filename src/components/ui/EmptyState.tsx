type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-finance-line bg-slate-50 p-8 text-center">
      <div className="text-lg font-extrabold text-finance-text">{title}</div>
      <p className="mt-2 text-sm leading-6 text-finance-muted">{description}</p>
    </div>
  )
}
