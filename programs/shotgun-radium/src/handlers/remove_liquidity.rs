use anchor_lang::prelude::*;

use crate::instructions::remove_liquidity::RemoveLiquidity;
use raydium_amm_cpi::Withdraw;

pub fn handler(
    ctx: Context<RemoveLiquidity>,
    amount: u64,
) -> Result<()> {

    let raydium_withdraw_accounts = Withdraw::from(&ctx.accounts);
    let raydium_withdraw_cpi_ctx = CpiContext::new(
        ctx.accounts.amm_program.to_account_info(), 
        raydium_withdraw_accounts
    );

    raydium_amm_cpi::withdraw(raydium_withdraw_cpi_ctx, amount)
}