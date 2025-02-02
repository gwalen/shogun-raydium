use anchor_lang::prelude::*;

use crate::instructions::add_liquidity::AddLiquidity;
use raydium_amm_cpi::Deposit;

pub fn handler(
    ctx: Context<AddLiquidity>,
    max_base_amount: u64,
    max_quote_amount: u64,
    fixed_side: u64, // 0 for base and 1 for quote
) -> Result<()> {

    let raydium_deposit_accounts = Deposit::from(&ctx.accounts);
    let raydium_deposit_cpi_ctx = CpiContext::new(
        ctx.accounts.amm_program.to_account_info(), 
        raydium_deposit_accounts
    );

    raydium_amm_cpi::deposit(
        raydium_deposit_cpi_ctx, 
        max_base_amount, 
        max_quote_amount, 
        fixed_side
    )
}