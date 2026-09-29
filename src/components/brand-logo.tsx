import { useState } from "react";

export function BrandLogo({ className = "h-10 sm:h-12" }: { className?: string }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className={`flex items-center gap-2 font-bold tracking-tight text-foreground ${className}`}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xs shadow-sm">
          DE
        </div>
        <span className="text-lg font-semibold tracking-tight">Dito Efeito</span>
      </div>
    );
  }

  return (
    <img
      src="/logo-ditoefeito.png"
      alt="Dito Efeito"
      className={`${className} w-auto object-contain`}
      onError={() => setImgError(true)}
    />
  );
}

