interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground/80">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground/55 mt-0.5 leading-relaxed">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
