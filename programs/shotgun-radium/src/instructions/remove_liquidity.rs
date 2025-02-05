use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use raydium_amm_cpi::Withdraw;

// #[derive(Accounts, Clone)]
#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    /// CHECK: Safe
    pub amm_program: UncheckedAccount<'info>,
    /// CHECK: Safe. Amm account
    #[account(mut)]
    pub amm: UncheckedAccount<'info>,
    /// CHECK: Safe. Amm authority Account
    pub amm_authority: UncheckedAccount<'info>,
    /// CHECK: Safe. amm open_orders Account
    #[account(mut)]
    pub amm_open_orders: UncheckedAccount<'info>,
    /// CHECK: Safe. amm target_orders Account. To store plan orders information.
    #[account(mut)]
    pub amm_target_orders: UncheckedAccount<'info>,
    /// CHECK: Safe. pool lp mint account. Must be empty, owned by $authority.
    #[account(mut)]
    pub amm_lp_mint: UncheckedAccount<'info>,
    /// CHECK: Safe. amm_base_vault Amm Account to withdraw FROM,
    #[account(mut)]
    pub amm_base_vault: UncheckedAccount<'info>,
    /// CHECK: Safe. amm_quote_vault Amm Account to withdraw FROM,
    #[account(mut)]
    pub amm_quote_vault: UncheckedAccount<'info>,
    /// CHECK: Safe. OpenBook program id
    pub market_program: UncheckedAccount<'info>,
    /// CHECK: Safe. OpenBook market Account. OpenBook program is the owner.
    #[account(mut)]
    pub market: UncheckedAccount<'info>,
    /// CHECK: Safe. OpenBook base_vault Account
    #[account(mut)]
    pub market_base_vault: UncheckedAccount<'info>,
    /// CHECK: Safe. OpenBook quote_vault Account
    #[account(mut)]
    pub market_quote_vault: UncheckedAccount<'info>,
    /// CHECK: Safe. OpenBook market authority (old name in previous version was market_vault_signer)
    pub market_authority: UncheckedAccount<'info>,
    /// CHECK: Safe. user lp token Account. Source lp, amount is transferable by $authority.
    #[account(mut)]
    pub user_token_lp: UncheckedAccount<'info>,
    /// CHECK: Safe. user token base Account. user Account to credit.
    #[account(mut)]
    pub user_token_base: UncheckedAccount<'info>,
    /// CHECK: Safe. user quote token Account. user Account to credit.
    #[account(mut)]
    pub user_token_quote: UncheckedAccount<'info>,
    /// CHECK: Safe. User wallet account
    #[account(mut)]
    pub user_owner: Signer<'info>,
    /// CHECK: Safe. OpenBook event queue account
    #[account(mut)]
    pub market_event_queue: UncheckedAccount<'info>,
    /// CHECK: Safe. OpenBook bid account
    #[account(mut)]
    pub market_bids: UncheckedAccount<'info>,
    /// CHECK: Safe. OpenBook ask account
    #[account(mut)]
    pub market_asks: UncheckedAccount<'info>,
    /// CHECK: Safe. The spl token program
    pub token_program: Program<'info, Token>,
}

impl<'info> From<&&mut RemoveLiquidity<'info>> for raydium_amm_cpi::Withdraw<'info> {
    fn from(accounts: &&mut RemoveLiquidity<'info>) -> Self {
        Withdraw {
            amm: accounts.amm.clone(),
            amm_authority: accounts.amm_authority.clone(),
            amm_open_orders: accounts.amm_open_orders.clone(),
            amm_target_orders: accounts.amm_target_orders.clone(),
            amm_lp_mint: accounts.amm_lp_mint.clone(),
            amm_coin_vault: accounts.amm_base_vault.clone(),
            amm_pc_vault: accounts.amm_quote_vault.clone(),
            market_program: accounts.market_program.clone(),
            market: accounts.market.clone(),
            market_coin_vault: accounts.market_base_vault.clone(),
            market_pc_vault: accounts.market_quote_vault.clone(),
            market_vault_signer: accounts.market_authority.clone(),
            user_token_lp: accounts.user_token_lp.clone(),
            user_token_coin: accounts.user_token_base.clone(),
            user_token_pc: accounts.user_token_quote.clone(),
            user_owner: accounts.user_owner.clone(),
            market_event_q: accounts.market_event_queue.clone(),
            market_bids: accounts.market_bids.clone(),
            market_asks: accounts.market_asks.clone(),
            token_program: accounts.token_program.clone(),
        }
    }
}
