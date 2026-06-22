export const PRIMARY_PROVIDER_CODE = "nium";
export const PRIMARY_PROVIDER_NAME = "Nium";

type ProviderLike = {
  code?: string | null;
};

export const isPrimaryProvider = (provider?: ProviderLike | null) =>
  provider?.code?.toLowerCase() === PRIMARY_PROVIDER_CODE;

export const filterPrimaryProviders = <T extends ProviderLike>(providers: T[] = []) =>
  providers.filter(isPrimaryProvider);
