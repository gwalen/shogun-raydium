import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShotgunRadium } from "../target/types/shotgun_radium";
import { PublicKey, Connection, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, Signer, TransactionInstruction, AddressLookupTableAccount, VersionedTransaction, TransactionMessage, ConfirmOptions, TransactionSignature } from "@solana/web3.js";
import * as assert from "assert";
import { createSyncNativeInstruction, getAccount, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, NATIVE_MINT } from "@solana/spl-token";
import {
  ApiV3PoolInfoStandardItem,
  Percent,
  AmmV4Keys,
  AmmV5Keys,
  Raydium,
  OPEN_BOOK_PROGRAM,
  LiquidityPoolKeys,
  toBN,
} from '@raydium-io/raydium-sdk-v2'


const AIRDROP_SOL_AMOUNT = 42 * LAMPORTS_PER_SOL;
// Solana mainnet usdc mint address
const USDC_MINT_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
// this usdc is present on the baseWallet usdc ata thanks to anchor.toml account import
// this account is defined in: usdc_base_wallet_token.json
const USDC_AMOUNT_IMPORTED_WITH_ANCHOR_TOML = 420690000000000n;

describe("shotgun-radium", () => {
  const marketProgramId = OPEN_BOOK_PROGRAM;  // or this one : SERUM_PROGRAM_ID_V3 (which is in the consts) ?

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const baseWallet = provider.wallet as anchor.Wallet;

  let connection: Connection = anchor.getProvider().connection;

  const program = anchor.workspace.ShotgunRadium as Program<ShotgunRadium>;

  let raydium: Raydium;
  let poolKeys: AmmV4Keys | AmmV5Keys | undefined;
  let poolInfo: ApiV3PoolInfoStandardItem;
  let baseWalletUsdcAta: PublicKey;
  let baseWalletWSolAta: PublicKey;
  let baseWalletLPAta: PublicKey;

  it("Airdrop SOL and check USDC balance", async () => {
    await airdrop(connection, baseWallet.publicKey);
    const baseWalletSolBalance = await connection.getBalance(baseWallet.publicKey);
    // there should be some Sol on our base wallet before airdrop 
    assert.ok(baseWalletSolBalance > AIRDROP_SOL_AMOUNT);

    // this is already created and imported in Anchor.toml (USDC ATA account)
    baseWalletUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT_ADDRESS,
      baseWallet.publicKey,
    );
    // baseWalletUsdcAta = (await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   baseWallet.payer,
    //   USDC_MINT_ADDRESS,
    //   baseWallet.publicKey
    // )).address;
    baseWalletWSolAta = (await getOrCreateAssociatedTokenAccount(
      connection,
      baseWallet.payer,
      NATIVE_MINT,
      baseWallet.publicKey,
    )).address;

    // convert 10 SOL to 10 WSOL (WSOL is required by raydium)
    await convertSolToWsol(connection, baseWallet.payer, 10);

    const baseWalletUsdcBalance = await getAccount(connection, baseWalletUsdcAta).then((token) => token.amount);
    const baseWalletWSolBalance = await getAccount(connection, baseWalletWSolAta).then((token) => token.amount);
    assert.equal(baseWalletUsdcBalance, USDC_AMOUNT_IMPORTED_WITH_ANCHOR_TOML);
    console.log("base wallet USDC:", baseWalletUsdcBalance);
    console.log("base wallet WSOL:", baseWalletWSolBalance);
  });

  it("Is initialized!", async () => {
    const poolId = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";

    raydium = await Raydium.load({
      owner: baseWallet.payer, //owner,
      connection,
      cluster: "mainnet",
      disableFeatureCheck: true,
      disableLoadToken: true,
      // blockhashCommitment: "finalized",
    })
    const data = await raydium.api.fetchPoolById({ ids: poolId });
    poolInfo = data[0] as ApiV3PoolInfoStandardItem;
    poolKeys = await raydium.liquidity.getAmmPoolKeys(poolId);

    console.log("Pool info: ", poolInfo);
    console.log("Pool keys: ", poolKeys);

    baseWalletLPAta = getAssociatedTokenAddressSync(
      new PublicKey(poolInfo.lpMint.address),
      baseWallet.publicKey,
    );

    // TODO: remove this is early testing
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  let lpTokensAfterDeposit = 0n;

  it("add liquidity", async () => {

    const max_base_amount = 1 * LAMPORTS_PER_SOL;
    const r = raydium.liquidity.computePairAmount({
      poolInfo,
      amount: max_base_amount,
      baseIn: true,
      slippage: new Percent(1, 100), // 1%
    })

    baseWalletLPAta = (await getOrCreateAssociatedTokenAccount(
      connection,
      baseWallet.payer,
      new PublicKey(poolInfo.lpMint.address),
      baseWallet.publicKey,
    )).address;

    const tx = await program.methods
      .addLiquidity(
        new anchor.BN(max_base_amount),
        r.maxAnotherAmount.raw,
        new anchor.BN(0) // fix side == base
      )
      .accounts({
        ammProgram: poolInfo.programId,
        amm: poolInfo.id,
        ammAuthority: poolKeys!.authority,
        ammOpenOrders: poolKeys!.openOrders,
        ammTargetOrders: poolKeys!.targetOrders,
        ammLpMint: poolInfo.lpMint.address,
        ammBaseVault: poolKeys!.vault.A,
        ammQuoteVault: poolKeys!.vault.B,
        market: poolKeys!.marketId,
        marketEventQueue: poolKeys!.marketEventQueue,
        userTokenBase: baseWalletWSolAta,   // SOL
        userTokenQuote : baseWalletUsdcAta, // USDC
        userTokenLp: baseWalletLPAta,       // LP
        userOwner: baseWallet.publicKey,
      })
      .signers([baseWallet.payer])
      // we have to do it to get meaning full error in anchor logs (other wise we get limited logs from tx simulation only)
      .rpc({ skipPreflight: true });

    const baseWalletLPBalance = await getAccount(connection, baseWalletLPAta).then((token) => token.amount);    
    console.log("LP tokens after adding liquidity: ", baseWalletLPBalance);
    assert.ok(baseWalletLPBalance > 0);
    lpTokensAfterDeposit = baseWalletLPBalance;
  });

  it("remove liquidity", async () => {

    // const max_base_amount = 1 * LAMPORTS_PER_SOL;
    // const r = raydium.liquidity.computePairAmount({
    //   poolInfo,
    //   amount: max_base_amount,
    //   baseIn: true,
    //   slippage: new Percent(1, 100), // 1%
    // })

    // baseWalletLPAta = (await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   baseWallet.payer,
    //   new PublicKey(poolInfo.lpMint.address),
    //   baseWallet.publicKey,
    // )).address;
    const lpTokensToWithdraw = lpTokensAfterDeposit / 10n;

    const tx = await program.methods
      .removeLiquidity(
        toBN(lpTokensToWithdraw)
      )
      .accounts({
        ammProgram: poolInfo.programId,
        amm: poolInfo.id,
        ammAuthority: poolKeys!.authority,
        ammOpenOrders: poolKeys!.openOrders,
        ammTargetOrders: poolKeys!.targetOrders,
        ammLpMint: poolInfo.lpMint.address,
        ammBaseVault: poolKeys!.vault.A,
        ammQuoteVault: poolKeys!.vault.B,
        market: poolKeys!.marketId,
        marketEventQueue: poolKeys!.marketEventQueue,
        userTokenBase: baseWalletWSolAta,   // SOL
        userTokenQuote : baseWalletUsdcAta, // USDC
        userTokenLp: baseWalletLPAta,       // LP
        userOwner: baseWallet.publicKey,
        //
        marketProgram: poolKeys!.marketProgramId,
        marketBaseVault: poolKeys!.marketBaseVault,
        marketQuoteVault: poolKeys!.marketQuoteVault,
        marketAuthority: poolKeys!.marketAuthority,
        marketAsks: poolKeys!.marketAsks,
        marketBids: poolKeys!.marketBids
      })
      .signers([baseWallet.payer])
      // we have to do it to get meaning full error in anchor logs (other wise we get limited logs from tx simulation only)
      .rpc({ skipPreflight: true });

    const baseWalletLPBalance = await getAccount(connection, baseWalletLPAta).then((token) => token.amount);    
    console.log("LP tokens after removing liquidity: ", baseWalletLPBalance);
    assert.ok(baseWalletLPBalance < lpTokensAfterDeposit);
  });


});

/*** Helpers ***/

export async function airdrop(connection: Connection, userPubkey: PublicKey) {
  const signature = await connection.requestAirdrop(userPubkey, AIRDROP_SOL_AMOUNT)
  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: signature,
  });
}

export async function convertSolToWsol(connection: Connection, payer: Keypair, amountSol: number): Promise<PublicKey> {
  const amountLamports = amountSol * LAMPORTS_PER_SOL; // Convert SOL input to lamports
  const transaction = new Transaction();

    // If the associated token account does not exist, create it
  const wsolAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,           // Payer
    NATIVE_MINT,     // Associated Token Account
    payer.publicKey, // Owner of the account
  );

  // Step 5: Transfer SOL into the associated token account (wrap SOL to WSOL)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey, // Payer's SOL account
      toPubkey: wsolAta.address, // WSOL Token Account
      lamports: amountLamports, // Amount to transfer (in lamports)
    })
  );

  // Add a sync_native instruction to align the WSOL account's state
  const syncNativeInstruction = createSyncNativeInstruction(wsolAta.address);
  transaction.add(syncNativeInstruction);

  // Step 7: Send and confirm the transaction
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
  console.log(`Transaction confirmed: ${signature}`);

  // Return the WSOL-associated token account address
  return wsolAta.address;
}

export function buildV0Transaction(
  signers: Signer[],
  instructions: TransactionInstruction[],
  latestBlockhash: string,
  addressLookupTableAccounts?: AddressLookupTableAccount[],
): VersionedTransaction {

  const messageV0 = new TransactionMessage({
    payerKey: signers[0].publicKey,
    recentBlockhash: latestBlockhash,
    instructions
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(messageV0);
  tx.sign(signers);
  return tx;
}


export async function sendTxWithConfirmation(
  provider: anchor.AnchorProvider,
  signers: Signer[],
  instructions: TransactionInstruction[],
  lookupTableAddress?: PublicKey,
  confirmOptions?: ConfirmOptions
): Promise<TransactionSignature> {

  let latestBlockhashData = await provider.connection.getLatestBlockhash();

  // let lookupTableAccounts: AddressLookupTableAccount[] | undefined = undefined;
  let lookupTableAccounts: AddressLookupTableAccount[] = [];
  if (lookupTableAddress != null) {
    const lookupTableAccount = await provider.connection
      .getAddressLookupTable(lookupTableAddress)
      .then((resp) => resp.value);
    if (lookupTableAccount === null) {
      throw new Error(`Lookup table account not found: ${lookupTableAddress.toBase58()}`);
    }
    lookupTableAccounts = [lookupTableAccount];
  }

  const txV0 = buildV0Transaction(signers, instructions, latestBlockhashData.blockhash, lookupTableAccounts);

  // will send tx and wait for confirmation with default confirmation level of the provider
  const txSignature = await provider.sendAndConfirm(txV0, signers, {
    // this is to get verbose error in anchor logs (can only be used in testing)  
    skipPreflight: true,
    // if commitment is not defined use default provider commitment (processed)
    commitment: confirmOptions === undefined ? provider.opts.commitment : confirmOptions.commitment
  });

  return txSignature;
}