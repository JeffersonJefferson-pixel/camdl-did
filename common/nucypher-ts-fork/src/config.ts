import { ChainId } from './types';

export type Configuration = {
  readonly porterUri: string;
};

const CONFIGS: { readonly [key in ChainId]: Configuration } = {
  [ChainId.POLYGON]: {
    porterUri: 'https://porter.nucypher.community',
  },
  [ChainId.MUMBAI]: {
    porterUri: 'https://porter-ibex.nucypher.community',
  },
  [ChainId.CAMDL_STAGING]: {
    porterUri: 'http://127.0.0.1:80',
  },
  [ChainId.LOCALHOST]: {
    porterUri: 'http://127.0.0.1:80',
  }
};

export const defaultConfiguration = (chainId: number): Configuration => {
  if (!Object.values(ChainId).includes(chainId)) {
    throw new Error(`No default configuration found for chainId: ${chainId}`);
  }
  return CONFIGS[chainId as ChainId];
};
