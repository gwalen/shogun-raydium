use anchor_lang::prelude::*;

pub mod handlers;
pub mod instructions;

use instructions::add_liquidity::*;
use instructions::remove_liquidity::*;

use handlers::*;

declare_id!("CHbnhtNeCb6YmDkesWCbh2swC35HqkGPhC7q17CzMuak");

#[program]
pub mod shogun_raydium {
    use super::*;

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        max_base_amount: u64,
        max_quote_amount: u64,
        fixed_side: u64, // 0 for base and 1 for quote
    ) -> Result<()> {
        add_liquidity::handler(ctx, max_base_amount, max_quote_amount, fixed_side)
    }

    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_token_amount: u64,
    ) -> Result<()> {
        remove_liquidity::handler(ctx, lp_token_amount)
    }

}