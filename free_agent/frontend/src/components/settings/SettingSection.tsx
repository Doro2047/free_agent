interface SettingSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}

export function SettingSection({ title, icon, children }: SettingSectionProps) {
  return (
    <div className="rounded-lg border border-border/30 bg-card/50 p-3.5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/8 text-primary/60">
            {icon}
          </span>
        )}
        <h3 className="text-xs font-semibold tracking-tight text-foreground/80">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}
