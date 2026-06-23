import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { getProviderDisplayName } from "@/lib/primaryProvider";

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
  const source = getProviderDisplayName(provider) || "OW";
  return source.trim().slice(0, 2).toUpperCase();
};

export const ProviderLogo = ({
  provider,
  className = "h-12 w-12 rounded-2xl",
  imageClassName = "p-1.5",
  fallbackClassName = "bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/15 dark:text-[#86efac]",
}: ProviderLogoProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = provider?.logo_url?.trim() || "";
  const providerLabel = getProviderDisplayName(provider);

  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl, provider?.code]);

  const baseClassName = `flex shrink-0 items-center justify-center overflow-hidden ${className}`;

  if (logoUrl && !imageFailed) {
    return (
      <div className={`${baseClassName} border border-[#e7e7df] bg-white dark:border-white/10 dark:bg-white`}>
        <img
          src={logoUrl}
          alt={`${providerLabel} logo`}
          className={`h-full w-full object-contain ${imageClassName}`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  const initials = getInitials(provider);

  return (
    <div className={`${baseClassName} ${fallbackClassName}`} aria-label={`${providerLabel} logo`}>
      {initials ? <span className="text-sm font-bold tracking-[0.08em]">{initials}</span> : <Building2 className="h-5 w-5" />}
    </div>
  );
};
