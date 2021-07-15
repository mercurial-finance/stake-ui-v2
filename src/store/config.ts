import { PublicKey } from '@solana/web3.js';

type Networks = { [label: string]: Network };

export type Network = {
  // Cluster.
  label: string;
  url: string;
  explorerClusterSuffix: string;

  // Faucets.
  srmFaucet: PublicKey | null;
  msrmFaucet: PublicKey | null;

  // Programs.
  registryProgramId: PublicKey;
  lockupProgramId: PublicKey;

  // Staking instances.
  registrars: { [token: string]: PublicKey };

  // Whitelisted token mints.
  mints: { [token: string]: PublicKey };
};

export const networks: Networks = {
  devnet: {
    // Cluster.
    label: 'Devnet',
    url: 'https://api.devnet.solana.com',
    explorerClusterSuffix: 'devnet',

    srmFaucet: null,
    msrmFaucet: null,

    registryProgramId: new PublicKey(
      'FDkNe6LN6F7o89gBoM9ej4nVzJUXZXHS833YNkTadtbT',
    ),
    lockupProgramId: new PublicKey(
      '38iokLufYnuxkb456pqwxtvjcZFA5AyiZBcyBTKDcPuq',
    ),
    registrars: {
      token1: new PublicKey('68hwNarRfgjx3wLBLdJZ6pCgXPAVEF61juQGe7XCLU64'),
      token2: new PublicKey('EbKhuVSWz6nn99dcCQMYuzNcdKXmkGzD6mELc4zY9WkG'),
    },
    mints: {
      token1: new PublicKey('DY3PyKxauZSsoBXD2bUcSB3TuzFs36g7vv3QmAdRvmaZ'),
      token2: new PublicKey('CbpqKjUFvYXfa9W2YswEgq71fBHKFAExnxu6LsdgR529'),
    },
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',

    srmFaucet: null,
    msrmFaucet: null,

    registryProgramId: new PublicKey(
      'BvD7C6FZDnCV47JYwYuRDmMcfyffzpBN9LdVEFWF6gKu',
    ),
    lockupProgramId: new PublicKey(
      '8wrTDbWsacFXE8cChWoucTTcgYHD1no2REwrGSGSm1MQ',
    ),
    registrars: {
      token1: new PublicKey('8WouKMcNovdr3FPZVg3bbvKFB5uER5iLrEF6ty9RX3Wu'),
      token2: new PublicKey('7ZnGYvdxZKiyQoSgUswehDbntgEuWAi6ft5HwRGrpQkb'),
    },
    mints: {
      token1: new PublicKey('HdHQhbnuWz9fV4FzviD3imBQV8PLdPrNa3NqXoevyhw1'),
      token2: new PublicKey('Ae3QGhmLvxq2YaqhHFUAdaNetzLpBUedK1VDDsEFbaGC'),
    },
  },
};
