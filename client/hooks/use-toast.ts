'use client'

import { toast as sonnerToast } from 'sonner'

type ToastVariant = 'default' | 'destructive' | 'warning'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

function toast({ title, description, variant = 'default', duration }: ToastOptions) {
  switch (variant) {
    case 'destructive':
      return sonnerToast.error(title, { description, duration })
    case 'warning':
      return sonnerToast.warning(title, { description, duration })
    default:
      return sonnerToast.success(title, { description, duration })
  }
}

function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => {
      if (id) sonnerToast.dismiss(id)
      else sonnerToast.dismiss()
    },
  }
}

export { useToast, toast }
