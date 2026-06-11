import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

export type ProviderLogoSource = {
  code?: string | null;
  name?: string | null;
  logo_url?: string | null;
};

type ProviderLogoProps = {
  provider?: ProviderLogoSource | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

const getInitials = (provider?: ProviderLogoSource | null) => {
  const source = provider?.code || provider?.name || "OW";
  return source.trim().slice(0, 2).toUpperCase();
};

export const ProviderLogo = ({
  provider,
  className = "h-12 w-12 rounded-2xl",
  imageClassName = "p-1.5",
  fallbackClassName = "bg-[#4f46e5]/10 text-[#4f46e5] dark:bg-[#4f46e5]/15 dark:text-[#8b83ff]",
}: ProviderLogoProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = provider?.logo_url?.trim() || "";

  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl, provider?.code]);

  const baseClassName = `flex shrink-0 items-center justify-center overflow-hidden ${className}`;

  if (logoUrl && !imageFailed) {
    return (
      <div className={`${baseClassName} border border-[#e7e7df] bg-white dark:border-white/10 dark:bg-white`}>
        <img
          src={logoUrl}
          alt={`${provider?.name || provider?.code || "Provider"} logo`}
          className={`h-full w-full object-contain ${imageClassName}`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  const initials = getInitials(provider);

  return (
    <div className={`${baseClassName} ${fallbackClassName}`} aria-label={`${provider?.name || initials} logo`}>
      {initials ? <span className="text-sm font-bold tracking-[0.08em]">{initials}</span> : <Building2 className="h-5 w-5" />}
    </div>
  );
};
