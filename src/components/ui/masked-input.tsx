"use client"

import { forwardRef } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

type InputProps = React.ComponentProps<"input">

interface MaskedInputProps extends InputProps {
  mask: 'cpf' | 'phone'
}

function applyMask(value: string, mask: 'cpf' | 'phone'): string {
  const digits = value.replace(/\D/g, '')
  if (mask === 'cpf') {
    return digits
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, className, ...props }, ref) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = applyMask(e.target.value, mask)
      e.target.value = masked
      onChange?.(e)
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text')
      const masked = applyMask(pasted, mask)
      const input = e.target as HTMLInputElement
      input.value = masked
      const nativeEvent = new Event('input', { bubbles: true })
      input.dispatchEvent(nativeEvent)
    }

    return (
      <Input
        ref={ref}
        onChange={handleChange}
        onPaste={handlePaste}
        className={cn('font-mono tracking-wider', className)}
        maxLength={mask === 'cpf' ? 14 : 15}
        {...props}
      />
    )
  }
)

MaskedInput.displayName = 'MaskedInput'

export { MaskedInput }