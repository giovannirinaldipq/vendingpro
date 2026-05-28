"use client"

import { forwardRef, useState } from 'react'
import { Input, InputProps } from './input'
import { cn } from '@/lib/utils'

interface MaskedInputProps extends Omit<InputProps, 'onChange'> {
  mask: 'cpf' | 'phone'
  value?: string
  onChange?: (value: string) => void
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onChange, className, ...props }, ref) => {
    const [cursorPosition, setCursorPosition] = useState(0)

    const applyMask = (value: string): string => {
      if (mask === 'cpf') {
        return value
          .replace(/\D/g, '')
          .replace(/(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})/, '$1.$2.$3-$4')
          .replace(/(-\d{2})+$/, '$1')
      }
      if (mask === 'phone') {
        return value
          .replace(/\D/g, '')
          .replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, '($1) $2-$3')
          .replace(/(\(\d{2}\) \d{5})(\d{4})+$/, '$1-$2')
      }
      return value
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      const maskedValue = applyMask(rawValue)

      if (onChange) {
        onChange(maskedValue)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const input = e.target as HTMLInputElement
        const start = input.selectionStart || 0
        const end = input.selectionEnd || 0

        // Se estiver selecionando texto, permite deletar normalmente
        if (start !== end) return

        // Para backspace, pula caracteres de máscara
        if (e.key === 'Backspace' && start > 0) {
          const prevChar = value?.[start - 1]
          if (prevChar && /\D/.test(prevChar)) {
            e.preventDefault()
            const newPosition = Math.max(0, start - 1)
            if (input.setSelectionRange) {
              input.setSelectionRange(newPosition, newPosition)
            }
          }
        }
      }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pastedData = e.clipboardData.getData('text')
      const cleanData = pastedData.replace(/\D/g, '')
      const maskedValue = applyMask(cleanData)

      if (onChange) {
        onChange(maskedValue)
      }
    }

    return (
      <Input
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          mask === 'cpf' && 'font-mono tracking-wider',
          mask === 'phone' && 'font-mono tracking-wider',
          className
        )}
        {...props}
        maxLength={mask === 'cpf' ? 14 : 15}
      />
    )
  }
)

MaskedInput.displayName = 'MaskedInput'

export { MaskedInput }