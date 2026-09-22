'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Password field with a show/hide toggle.
 *
 * Wraps the shared Input so every password field in the app gets identical
 * behaviour and padding. The toggle is a real <button> rather than a span with
 * an onClick, so it stays reachable with the keyboard and is announced
 * correctly by screen readers.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const label = visible ? 'Sembunyikan password' : 'Tampilkan password';

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          disabled={disabled}
          type={visible ? 'text' : 'password'}
          className={cn('pr-11', className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={label}
          aria-pressed={visible}
          title={label}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
