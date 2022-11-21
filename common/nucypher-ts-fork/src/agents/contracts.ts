import { ChainId, ChecksumAddress } from '../types';

type Contracts = {
  readonly SUBSCRIPTION_MANAGER: ChecksumAddress;
};

const POLYGON: Contracts = {
  SUBSCRIPTION_MANAGER: '0xB0194073421192F6Cf38d72c791Be8729721A0b3',
};

const MUMBAI: Contracts = {
  SUBSCRIPTION_MANAGER: '0xb9015d7b35ce7c81dde38ef7136baa3b1044f313',
};

const CAMDL_STAGING: Contracts = {
  SUBSCRIPTION_MANAGER: '0x59B4808C29cBa1aEEea6BF6f25FDa127B9201bDf'
};

const LOCALHOST: Contracts = {
  SUBSCRIPTION_MANAGER: '0xD76a293400015266438C6DD1C9A00Ed7675cc5E8'
}

const CONTRACTS: { readonly [key in ChainId]: Contracts } = {
  [ChainId.POLYGON]: POLYGON,
  [ChainId.MUMBAI]: MUMBAI,
  [ChainId.CAMDL_STAGING]: CAMDL_STAGING,
  [ChainId.LOCALHOST]: LOCALHOST
};

export const getContracts = (chainId: number): Contracts => {
  if (!Object.values(ChainId).includes(chainId)) {
    throw new Error(`No contracts found for chainId: ${chainId}`);
  }
  return CONTRACTS[chainId as ChainId];
};

export const DEFAULT_WAIT_N_CONFIRMATIONS = 1;
