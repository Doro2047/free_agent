import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'destructive' | 'outline' | 'secondary'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon'
}

export function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'select-none',
        {
          // Default variant with gradient and shadow
          'bg-gradient-primary text-primary-foreground shadow-md hover:shadow-lg active:shadow-sm': variant === 'default',
          // Ghost variant with subtle hover
          'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
          // Destructive variant
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md': variant === 'destructive',
          // Outline variant
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
          // Sizes
          'h-8 px-3 text-xs': size === 'sm',
          'h-10 px-4 py-2': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
          'h-10 w-10': size === 'icon',
        },
        // 閫氱敤缂╂斁鏁堟灉
        'hover:scale-[1.02] active:scale-[0.98]',
        className,
      )}
      {...props}
    />
  )
}
