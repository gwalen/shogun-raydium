# Shotgun - Raydium Liquidity Management

This program contains two instructions that interact with the Raydium AMM liquidity pool:
* `AddLiquidity`
* `RemoveLiquidity`

For on-chain interactions, the Raydium Rust SDK is used - `raydium-amm-cpi` (imported in `Cargo.toml`).  
For off-chain interactions, the Raydium TypeScript SDK is used - `"@raydium-io/raydium-sdk-v2": "0.1.111-alpha"` (imported in `package.json`).

## Program Structure:
### Handlers
Contains the program's business logic responsible for communication with the Raydium protocol.

### Instructions
Contains the instruction definition, along with the list of accounts required to call the given instruction.

## Test Structure
For testing, we use the SOL/USDC pool.  

Please check the `Anchor.toml` file to see how all the required accounts and programs are imported for local testing with "forked" accounts.
Accounts used for testing are taken from the Solana mainnet.

There are 3 tests:
1. **Add liquidity transaction** - Adds liquidity to the pool on behalf of the user.
2. **Remove liquidity transaction** - Removes all liquidity added in Step 1.
3. **Add and remove liquidity in one transaction** - Creates a transaction consisting of two instructions (to add and partially remove liquidity), which are executed at once. In this test, we add liquidity and then remove just a part of it in the remove liquidity instruction.

## How to Build and Test

### Install TypeScript Dependencies:
```
yarn install
```

### Run Anchor Tests:
```
anchor test --arch sbf
```