import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import s from './Pixel.module.css';

type PanelProps = HTMLAttributes<HTMLDivElement> & { title?: string };

export const PixelPanel = forwardRef<HTMLDivElement, PanelProps>(function PixelPanel(
  { title, children, className = '', ...rest },
  ref,
) {
  return (
    <div ref={ref} className={`${s.panel} ${className}`} {...rest}>
      {title && <h2 className={s.title}>{title}</h2>}
      {children}
    </div>
  );
});

export function PixelButton({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' }) {
  return <button type="button" className={`${variant === 'primary' ? s.button : s.quiet} ${className}`} {...rest} />;
}

export function KeyCap({ children }: { children: ReactNode }) {
  return <kbd className={s.key}>{children}</kbd>;
}
