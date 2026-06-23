export const PRIMARY_PROVIDER_CODE = "nium";
export const PRIMARY_PROVIDER_NAME = "Origin Wallet";

type ProviderLike = {
  code?: string | null;
};

type ProviderDisplayLike = ProviderLike & {
  name?: string | null;
};

export const isPrimaryProvider = (provider?: ProviderLike | null) =>
  provider?.code?.toLowerCase() === PRIMARY_PROVIDER_CODE;

export const filterPrimaryProviders = <T extends ProviderLike>(providers: T[] = []) =>
  providers.filter(isPrimaryProvider);

export const getProviderDisplayName = (provider?: ProviderDisplayLike | null) => {
  if (!provider?.name || isPrimaryProvider(provider) || provider.name.toLowerCase() === PRIMARY_PROVIDER_CODE) {
    return PRIMARY_PROVIDER_NAME;
  }

  return provider.name;
};

export const getProviderDisplayCode = (code?: string | null) =>
  code?.toLowerCase() === PRIMARY_PROVIDER_CODE ? "origin-wallet" : code || "-";
