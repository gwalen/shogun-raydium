use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use raydium_amm_cpi::Deposit;

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    /// CHECK: Safe
    pub amm_program: UncheckedAccount<'info>,
    /// CHECK: Safe. Amm Account
    #[account(mut)]
    pub amm: UncheckedAccount<'info>,
    /// CHECK: Safe. Amm authority
    pub amm_authority: UncheckedAccount<'info>,
    /// CHECK: Safe. AMM open_orders Account.
    #[account()]
    pub amm_open_orders: UncheckedAccount<'info>,
    /// CHECK: Safe. AMM target orders account. To store plan orders information.
    #[account(mut)]
    pub amm_target_orders: UncheckedAccount<'info>,
    /// CHECK: Safe. LP mint account. Must be empty, owned by $authority.
    #[account(mut)]
    pub amm_lp_mint: UncheckedAccount<'info>,
    /// CHECK: Safe. amm_coin_vault account, $authority can transfer amount.
    #[account(mut)]
    pub amm_coin_vault: UncheckedAccount<'info>,
    /// CHECK: Safe. amm_pc_vault account, $authority can transfer amount.
    #[account(mut)]
    pub amm_pc_vault: UncheckedAccount<'info>,
    /// CHECK: Safe. OpenBook market account, OpenBook program is the owner.
    pub market: UncheckedAccount<'info>,
    /// CHECK: Safe. OpenBook market event queue account, OpenBook program is the owner.
    pub market_event_queue: UncheckedAccount<'info>,
    /// CHECK: Safe. User token coin to deposit into.
    #[account(mut)]
    pub user_token_coin: UncheckedAccount<'info>,
    /// CHECK: Safe. User token pc to deposit into.
    #[account(mut)]
    pub user_token_pc: UncheckedAccount<'info>,
    /// CHECK: Safe. User lp token, to deposit the generated tokens, user is the owner
    #[account(mut)]
    pub user_token_lp: UncheckedAccount<'info>,
    /// CHECK: Safe. User wallet account
    #[account(mut)]
    pub user_owner: Signer<'info>,
    /// CHECK: Safe. The spl token program
    pub token_program: Program<'info, Token>,
}

impl<'info> From<&&mut AddLiquidity<'info>> for raydium_amm_cpi::Deposit<'info> {
    fn from(accounts: &&mut AddLiquidity<'info>) -> Self {
        Deposit {
            amm: accounts.amm.clone(),
            amm_authority: accounts.amm_authority.clone(),
            amm_open_orders: accounts.amm_open_orders.clone(),
            amm_target_orders: accounts.amm_target_orders.clone(),
            amm_lp_mint: accounts.amm_lp_mint.clone(),
            amm_coin_vault: accounts.amm_coin_vault.clone(),
            amm_pc_vault: accounts.amm_pc_vault.clone(),
            market: accounts.market.clone(),
            market_event_queue: accounts.market_event_queue.clone(),
            user_token_coin: accounts.user_token_coin.clone(),
            user_token_pc: accounts.user_token_pc.clone(),
            user_token_lp: accounts.user_token_lp.clone(),
            user_owner: accounts.user_owner.clone(),
            token_program: accounts.token_program.clone(),
        }
    }
}
