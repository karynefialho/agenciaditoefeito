import darkLogo from "@/assets/dito-efeito-dark.png.asset.json";
import lightLogo from "@/assets/dito-efeito-light.png.asset.json";

export function BrandLogo({ className = "h-7" }: { className?: string }) {
  return (
    <>
      <img src={darkLogo.url} alt="Dito Efeito" className={`${className} w-auto dark:hidden`} />
      <img
        src={lightLogo.url}
        alt="Dito Efeito"
        className={`${className} hidden w-auto dark:block`}
      />
    </>
  );
}
