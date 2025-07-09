export interface TokenBalance {
  address: string;
  balance: number;
  decimals: number;
  id: string;
  isNative: boolean;
  logoURI: string;
  marketValue: number;
  name: string;
  networkId: number;
  price: number;
  rawBalance: number;
  symbol: string;
}

export async function fetchTokenBalances({
  accountAddress,
  networkId = 84532,
  includePrices = true,
  includeNative = true,
  sdkId = process.env.EXPO_PUBLIC_ENVIRONMENT_ID as string,
}: {
  accountAddress: string;
  networkId?: number;
  includePrices?: boolean;
  includeNative?: boolean;
  sdkId?: string;
}): Promise<TokenBalance[]> {
  const url = `https://app.dynamicauth.com/api/v0/sdk/${sdkId}/chains/EVM/balances?networkId=${networkId}&accountAddress=${accountAddress}&includePrices=${includePrices}&includeNative=${includeNative}`;
  const options = { method: "GET" };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Failed to fetch balances: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error("Error fetching token balances:", err);
    throw err;
  }
}
