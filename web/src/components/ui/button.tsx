import { cn } from '@/lib/utils'
import { Spinner } from './spinner'
import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: Variant
}

const variants: Record<Variant, string> = {
  primary:   'bg-brand-orange hover:bg-brand-orange-dark text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
  danger:    'bg-red-500 hover:bg-red-600 text-white',
  ghost:     'text-brand-orange hover:bg-brand-orange/10',
}

export function Button({
  loading = false,
  variant = 'primary',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={loading || disabled}
      className={cn(
        'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60',
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
