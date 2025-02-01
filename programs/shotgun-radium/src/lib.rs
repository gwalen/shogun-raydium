use anchor_lang::prelude::*;

declare_id!("CHbnhtNeCb6YmDkesWCbh2swC35HqkGPhC7q17CzMuak");

#[program]
pub mod shotgun_radium {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
