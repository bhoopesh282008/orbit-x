import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-45 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-accent-blue text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_6px_18px_-10px_var(--accent-blue)] hover:brightness-110',
        secondary:
          'bg-bg-elevated text-text-primary border border-white/10 shadow-[inset_0_1px_0_var(--panel-highlight)] hover:border-white/20 hover:bg-white/[0.07]',
        outline: 'border border-accent-blue/45 text-accent-blue hover:bg-accent-blue/10 hover:border-accent-blue/70',
        ghost: 'text-text-secondary hover:text-text-primary hover:bg-white/5',
        danger: 'bg-status-danger text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:brightness-110',
        success: 'bg-status-success text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:brightness-110',
        cyan: 'bg-text-primary text-bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:bg-text-primary/90',
        link: 'h-auto px-0 text-accent-blue underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-9 w-9 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
