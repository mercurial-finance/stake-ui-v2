import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import { PublicKey } from '@solana/web3.js';
import { State as StoreState } from '../../store/reducer';
import { AccountInfo as TokenAccount, ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAsync } from 'react-async-hook';
import { toDisplay } from '../../utils/tokens';
import { ProgramAccount } from '@project-serum/anchor';

type Props = {
  style?: any;
  decimals?: number;
  variant?: 'outlined' | 'standard';
  onChange: (from: ProgramAccount<TokenAccount>) => void;
};

// To avoid painful overall refactor, we introduce V2, which is a drop down showing every owned token mints with an ATA
export default function OwnedTokenAccountsSelectV2(p: Props) {
  const { decimals, variant, onChange, style } = p;
  const ownedTokenAccounts = useSelector((state: StoreState) => {
    return state.common.ownedTokenAccounts;
  });

  // Ultimately store should directly deliver that array
  const ownedATAs = useAsync(async () => {
    const atas: ProgramAccount<TokenAccount>[] = [];
    for (const ota of ownedTokenAccounts) {
      const isATA = ota.publicKey.equals(await Token.getAssociatedTokenAddress(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          ota.account.mint,
          ota.account.owner,
      ))
      if (isATA) {
        atas.push(ota);
      }
    }
    return atas
  }, [ownedTokenAccounts]);

  const [fromAccount, setFromAccount] = useState('');

  return (
    <>
      <Select
        style={style}
        variant={variant}
        fullWidth
        value={fromAccount}
        onChange={e => {
          const pk = e.target.value as string;
          setFromAccount(pk);
          const pubkey = new PublicKey(pk);
          const ata = ownedATAs
            .result!
            .filter(ota => ota.publicKey.equals(pubkey))
            .pop()!;
          onChange(ata);
        }}
      >
        {ownedATAs.result?.length === 0 ? (
          <MenuItem value={''}>No token accounts found</MenuItem>
        ) : (
          ownedATAs.result?.map(ownedTokenAccount => {
            return (
              <MenuItem value={ownedTokenAccount.publicKey.toString()}>
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    overflow: 'hidden',
                  }}
                >
                  <div>{`${ownedTokenAccount.publicKey}`}</div>
                  {decimals && (
                    <div style={{ float: 'right', color: '#ccc' }}>{`${toDisplay(
                      ownedTokenAccount.account.amount,
                      decimals ?? 0,
                    )}`}</div>
                  )}
                </div>
              </MenuItem>
            );
          })
        )}
      </Select>
    </>
  );
}
