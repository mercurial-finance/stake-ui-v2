import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import BN from 'bn.js';
import { useSnackbar } from 'notistack';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import * as serumCmn from '@project-serum/common';
import { TokenInstructions } from '@project-serum/serum';
import {
  Keypair,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { useWallet } from '../../components/common/WalletProvider';
import { State as StoreState } from '../../store/reducer';
import * as notification from '../common/Notification';
import { fromDisplay } from '../../utils/tokens';
import { activeRegistrar } from '../common/RegistrarSelect';
import OwnedTokenAccountsSelectV2 from '../common/OwnerTokenAccountsSelectV2';
import { ProgramAccount } from '@project-serum/anchor';
import { AccountInfo as TokenAccount } from '@solana/spl-token';

export default function DropRewardButton() {
  const [showDialog, setShowDialog] = useState(false);
  return (
    <>
      <div onClick={() => setShowDialog(true)}>
        <Button variant="contained" color="secondary">
          Drop Rewards
        </Button>
      </div>
      <DropRewardDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
}

enum RewardTypeViewModel {
  Unlocked,
  Locked,
}

type DropRewardsDialogProps = {
  open: boolean;
  onClose: () => void;
};

function DropRewardDialog(props: DropRewardsDialogProps) {
  const { open, onClose } = props;
  const { selectedRegistrar } = useSelector((state: StoreState) => {
    return {
      selectedRegistrar: activeRegistrar(state),
    };
  });
  const [rewardTypeTab, setRewardTypeTab] = useState(
    RewardTypeViewModel.Unlocked,
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h4" component="h2">
            {`Drop Rewards on ${selectedRegistrar.label.toUpperCase()} Stakers`}
          </Typography>
        </div>
      </DialogTitle>
      <DialogContent>
        <Tabs value={rewardTypeTab} onChange={(_e, t) => setRewardTypeTab(t)}>
          <Tab value={RewardTypeViewModel.Unlocked} label="Unlocked" />
          <Tab value={RewardTypeViewModel.Locked} label="Locked" />
        </Tabs>
        {rewardTypeTab === RewardTypeViewModel.Unlocked && (
          <DropUnlockedForm onClose={onClose} />
        )}
        {rewardTypeTab === RewardTypeViewModel.Locked && (
          <DropLockedForm onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

type DropUnlockedFormProps = {
  onClose: () => void;
};

function DropUnlockedForm(props: DropUnlockedFormProps) {
  const { onClose } = props;
  const snack = useSnackbar();
  const { registryClient } = useWallet();
  const { registrar } = useSelector((state: StoreState) => {
    return {
      registrar: {
        publicKey: state.registry.registrar,
        account: state.accounts[state.registry.registrar.toString()],
      }
    };
  });

  const [rewardDisplayAmount, setRewardDisplayAmount] = useState<null | number>(
    null,
  );
  const [expiryTs, setExpiryTs] = useState<null | number>(null);
  const [depositor, setDepositor] = useState<null | ProgramAccount<TokenAccount>>(null);

  const isSendEnabled =
    depositor !== null &&
    rewardDisplayAmount !== null &&
    rewardDisplayAmount >= 100 &&
    expiryTs !== null;

  const sendUnlockedReward = async () => {
    await notification.withTx(
      snack,
      'Dropping unlocked reward...',
      'Unlocked reward dropped',
      async () => {
        if (!depositor) {
          throw new Error('Invalid state, depositor is not set');
        }
        const mintAccount = await serumCmn.getMintInfo(
          registryClient.provider,
          depositor.account.mint,
        );

        const unlockedRewardAmount = fromDisplay(
          rewardDisplayAmount!,
          mintAccount.decimals,
        );
        const rewardKind = { unlocked: {} };
        const vendor = new Keypair();
        const vendorVault = new Keypair();
        const [vendorSigner, nonce] = await PublicKey.findProgramAddress(
          [registrar.publicKey.toBuffer(), vendor.publicKey.toBuffer()],
          registryClient.programId,
        );
        return await registryClient.rpc.dropReward(
          rewardKind,
          unlockedRewardAmount,
          new BN(expiryTs!),
          registryClient.provider.wallet.publicKey,
          nonce,
          {
            accounts: {
              registrar: registrar.publicKey,
              rewardEventQ: registrar.account.rewardEventQ,
              poolMint: registrar.account.poolMint,
              vendor: vendor.publicKey,
              vendorVault: vendorVault.publicKey,
              depositor: depositor.publicKey,
              depositorAuthority: registryClient.provider.wallet.publicKey,
              tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
              clock: SYSVAR_CLOCK_PUBKEY,
              rent: SYSVAR_RENT_PUBKEY,
            },
            signers: [vendorVault, vendor],
            instructions: [
              ...(await serumCmn.createTokenAccountInstrs(
                registryClient.provider,
                vendorVault.publicKey,
                depositor.account.mint,
                vendorSigner,
              )),
              await registryClient.account.rewardVendor.createInstruction(
                vendor,
              ),
            ],
          },
        );
      },
    );
    onClose();
  };
  const onClick = () => {
    sendUnlockedReward().catch(err => {
      console.error(err);
      snack.enqueueSnackbar(
        `Error dropping unlocked reward: ${err.toString()}`,
        {
          variant: 'error',
        },
      );
    });
  };
  return (
    <DropVendorForm
      setDepositor={setDepositor}
      setRewardDisplayAmount={setRewardDisplayAmount}
      expiryTs={expiryTs}
      setExpiryTs={setExpiryTs}
      onCancel={onClose}
      onClick={onClick}
      isSendEnabled={isSendEnabled}
    />
  );
}

type DropLockedFormProps = DropUnlockedFormProps;

function DropLockedForm(props: DropLockedFormProps) {
  const { onClose } = props;
  const snack = useSnackbar();
  const { registryClient } = useWallet();
  const { registrar } = useSelector((state: StoreState) => {
    return {
      registrar: {
        publicKey: state.registry.registrar,
        account: state.accounts[state.registry.registrar.toString()],
      }
    };
  });

  const [rewardDisplayAmount, setRewardDisplayAmount] = useState<null | number>(
    null,
  );
  const [startTs, setStartTs] = useState<null | number>(null);
  const [endTs, setEndTs] = useState<null | number>(null);
  const [expiryTs, setExpiryTs] = useState<null | number>(null);
  const [depositor, setDepositor] = useState<null | ProgramAccount<TokenAccount>>(null);
  const [periodCount, setPeriodCount] = useState(7);

  const isSendEnabled =
    startTs !== null &&
    endTs !== null &&
    depositor !== null &&
    rewardDisplayAmount !== null &&
    rewardDisplayAmount >= 100 &&
    expiryTs !== null;

  const sendLockedRewards = async () => {
    await notification.withTx(
      snack,
      'Dropping locked reward...',
      'Locked reward dropped',
      async () => {
        const rewardKind = {
          locked: {
            startTs: new BN(startTs!),
            endTs: new BN(endTs!),
            periodCount: new BN(periodCount),
          },
        };
        const vendor = new Keypair();
        const vendorVault = new Keypair();
        const [vendorSigner, nonce] = await PublicKey.findProgramAddress(
          [registrar.publicKey.toBuffer(), vendor.publicKey.toBuffer()],
          registryClient.programId,
        );
        const mintAccount = await serumCmn.getMintInfo(
          registryClient.provider,
          depositor!.account.mint,
        );
        const rewardAmount = fromDisplay(
          rewardDisplayAmount!,
          mintAccount.decimals,
        );
        return await registryClient.rpc.dropReward(
          rewardKind,
          rewardAmount,
          new BN(expiryTs!),
          registryClient.provider.wallet.publicKey,
          nonce,
          {
            accounts: {
              registrar: registrar.publicKey,
              rewardEventQ: registrar.account.rewardEventQ,
              poolMint: registrar.account.poolMint,
              vendor: vendor.publicKey,
              vendorVault: vendorVault.publicKey,
              depositor,
              depositorAuthority: registryClient.provider.wallet.publicKey,
              tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
              clock: SYSVAR_CLOCK_PUBKEY,
              rent: SYSVAR_RENT_PUBKEY,
            },
            signers: [vendorVault, vendor],
            instructions: [
              ...(await serumCmn.createTokenAccountInstrs(
                registryClient.provider,
                vendorVault.publicKey,
                depositor!.account.mint,
                vendorSigner,
              )),
              await registryClient.account.rewardVendor.createInstruction(
                vendor,
              ),
            ],
          },
        );
      },
    );
    onClose();
  };

  const onClick = () => {
    sendLockedRewards().catch(err => {
      snack.enqueueSnackbar(`Error dropping locked reward: ${err.toString()}`, {
        variant: 'error',
      });
    });
  };

  return (
    <DropVendorForm
      setDepositor={setDepositor}
      setRewardDisplayAmount={setRewardDisplayAmount}
      setStartTs={setStartTs}
      setEndTs={setEndTs}
      periodCount={periodCount}
      setPeriodCount={setPeriodCount}
      expiryTs={expiryTs}
      setExpiryTs={setExpiryTs}
      onCancel={onClose}
      onClick={onClick}
      isSendEnabled={isSendEnabled}
    />
  );
}

type DropVendorFormProps = {
  setDepositor: (acc: ProgramAccount<TokenAccount>) => void;
  setRewardDisplayAmount: (n: number) => void;
  setStartTs?: (n: number) => void;
  setEndTs?: (n: number) => void;
  periodCount?: number;
  setPeriodCount?: (p: number) => void;
  expiryTs: number | null;
  setExpiryTs: (ts: number) => void;
  onCancel: () => void;
  onClick: () => void;
  isSendEnabled: boolean;
};

function DropVendorForm(props: DropVendorFormProps) {
  const {
    setDepositor,
    setRewardDisplayAmount,
    setStartTs,
    setEndTs,
    periodCount,
    setPeriodCount,
    expiryTs,
    setExpiryTs,
    onCancel,
    onClick,
    isSendEnabled,
  } = props;
  return (
    <>
      <div>
        <div style={{ display: 'flex', marginTop: '10px' }}>
          <div style={{ flex: 1}}>
            <OwnedTokenAccountsSelectV2
              style={{ height: '100%' }}
              onChange={(f: ProgramAccount<TokenAccount>) => setDepositor(f)}
            />
            <FormHelperText>Account to send from</FormHelperText>
          </div>
          <div>
            <TextField
              style={{ marginLeft: '10px', marginTop: '10px' }}
              id="outlined-number"
              label="Amount"
              type="number"
              InputLabelProps={{
                shrink: true,
              }}
              variant="outlined"
              onChange={e =>
                setRewardDisplayAmount(parseFloat(e.target.value) as number)
              }
              InputProps={{ inputProps: { min: 0 } }}
            />
          </div>
        </div>
        {setEndTs !== undefined && setStartTs !== undefined && (
          <>
            <div style={{ display: 'flex', marginTop: '37px' }}>
              <div style={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Start date"
                  type="datetime-local"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={e => {
                    const d = new Date(e.target.value);
                    setStartTs(d.getTime() / 1000);
                  }}
                />
                <FormHelperText>Date vesting begins</FormHelperText>
              </div>
            </div>
            <div style={{ flex: 1, marginTop: '20px' }}>
              <TextField
                fullWidth
                label="End date"
                type="datetime-local"
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={e => {
                  const d = new Date(e.target.value);
                  setEndTs(d.getTime() / 1000);
                }}
              />
              <FormHelperText>
                Date the vesting account is fully vested
              </FormHelperText>
            </div>
            <div>
              <FormControl fullWidth>
                <TextField
                  style={{ marginTop: '37px' }}
                  id="outlined-number"
                  label="Period Count"
                  type="number"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  variant="outlined"
                  value={periodCount}
                  onChange={e =>
                    setPeriodCount!(parseInt(e.target.value) as number)
                  }
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </FormControl>
            </div>
          </>
        )}
        <div style={{ marginTop: '37px', display: 'flex' }}>
          <div
            style={{
              flex: 1,
              height: '100%',
              marginRight: '10px',
            }}
          >
            <TextField
              fullWidth
              label="Expiry date"
              type="datetime-local"
              InputLabelProps={{
                shrink: true,
              }}
              onChange={e => {
                const d = new Date(e.target.value);
                setExpiryTs(d.getTime() / 1000);
              }}
            />
            <FormHelperText>
              Date after which the account owner dropping rewards can withdraw
              all unclaimed rewards.
            </FormHelperText>
          </div>
          <div style={{ marginTop: '26px' }}>
            <TextField
              style={{ height: '100%' }}
              disabled
              placeholder="Expiry Unix timestamp"
              fullWidth
              value={expiryTs}
            />
          </div>
        </div>
      </div>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onClick}
          type="submit"
          color="primary"
          disabled={!isSendEnabled}
        >
          Send
        </Button>
      </DialogActions>
    </>
  );
}
