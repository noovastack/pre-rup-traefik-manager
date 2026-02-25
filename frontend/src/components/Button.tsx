interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}

const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors transition-shadow transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<string, string> = {
  primary: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] focus-visible:ring-cyan-500 border border-transparent',
  danger:  'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/50 hover:border-rose-500 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] focus-visible:ring-rose-500',
  ghost:   'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus-visible:ring-slate-700 border border-transparent',
};

const sizes: Record<string, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4    py-2   text-sm',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
