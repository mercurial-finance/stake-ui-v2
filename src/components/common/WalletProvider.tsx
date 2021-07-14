import React, {
  PropsWithChildren,
  ReactElement,
  ReactNode,
  useMemo,
  useContext,
} from 'react';
import { useSelector } from 'react-redux';
import { Connection, ConfirmOptions } from '@solana/web3.js';
// @ts-ignore
import Wallet from '@project-serum/sol-wallet-adapter';
import { Idl, Program, Provider } from '@project-serum/anchor';
import { State as StoreState } from '../../store/reducer';
import LockupIdl from '../../idl/lockup.json';
import RegistryIdl from '../../idl/registry.json';

export function useWallet(): WalletContextValues {
  const w = useContext(WalletContext);
  if (!w) {
    throw new Error('Missing wallet context');
  }
  return w;
}

const WalletContext = React.createContext<null | WalletContextValues>(null);

type WalletContextValues = {
  wallet: Wallet;
  lockupClient: Program;
  registryClient: Program;
};

export default function WalletProvider(
  props: PropsWithChildren<ReactNode>,
): ReactElement {
  const { walletProvider, network } = useSelector((state: StoreState) => {
    return {
      walletProvider: state.common.walletProvider,
      network: state.common.network,
    };
  });

  const {
    wallet,
    lockupClient,
    registryClient,
  } = useMemo(() => {
    const opts: ConfirmOptions = {
      preflightCommitment: 'recent',
      commitment: 'recent',
    };
    const connection = new Connection(network.url, opts.preflightCommitment);
    const wallet = new Wallet(walletProvider, network.url);
    // @ts-ignore
    const provider = new Provider(connection, wallet, opts);

    const lockupClient = new Program(
      LockupIdl as Idl,
      network.lockupProgramId,
      provider,
    );
    const registryClient = new Program(
      RegistryIdl as Idl,
      network.registryProgramId,
      provider,
    );

    return {
      wallet,
      lockupClient,
      registryClient,
    };
  }, [walletProvider, network]);

  return (
    <WalletContext.Provider
      value={{ wallet, lockupClient, registryClient }}
    >
      {props.children}
    </WalletContext.Provider>
  );
}
