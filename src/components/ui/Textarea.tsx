interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export default function Textarea({ label, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm text-text-secondary font-medium">{label}</label>}
      <textarea
        className={`w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-blue/40 focus:ring-1 focus:ring-accent-blue/20 transition-all duration-200 resize-y min-h-[120px] ${className}`}
        {...props}
      />
    </div>
  );
}
