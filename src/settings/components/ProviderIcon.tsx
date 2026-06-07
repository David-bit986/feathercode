import { ProviderLogo } from "@/modules/ai/components/ProviderLogo";
import type { ProviderId } from "@/modules/ai/config";

type Props = {
  provider: ProviderId;
  size?: number;
  className?: string;
};

export function ProviderIcon({ provider, size = 14, className }: Props) {
  return (
    <ProviderLogo
      provider={provider}
      size={size}
      className={className}
    />
  );
}
