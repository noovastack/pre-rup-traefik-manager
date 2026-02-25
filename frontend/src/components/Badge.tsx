interface BadgeProps {
  variant?: 'green' | 'blue' | 'gray' | 'red' | 'primary';
  children: React.ReactNode;
}

const variants: Record<string, string> = {
  green:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  blue:    'bg-cyan-500/10    text-cyan-400    border-cyan-500/20    drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]',
  gray:    'bg-slate-800/50   text-slate-300   border-slate-700',
  red:     'bg-rose-500/10    text-rose-400    border-rose-500/20',
  primary: 'bg-cyan-500/10    text-cyan-400    border-cyan-500/20    drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]',
};

export function Badge({ variant = 'gray', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 border rounded text-xs font-semibold tracking-wide ${variants[variant]}`}>
      {children}
    </span>
  );
}
