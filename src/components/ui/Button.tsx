interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gradient" | "ghost";
  children: React.ReactNode;
}

export default function Button({ variant = "gradient", children, className = "", ...props }: ButtonProps) {
  const base = "flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 rounded-xl px-5 py-2.5 cursor-pointer";
  const variants = {
    gradient: "btn-gradient",
    ghost: "text-text-secondary hover:text-text-primary hover:bg-white/[0.03] border border-white/[0.06]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
