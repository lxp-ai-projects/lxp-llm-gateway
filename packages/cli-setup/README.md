# @lxp/cli-setup

First-time setup CLI for `lxp-llm-gateway`.

It generates and validates the root `.env` used by the setup wizard.

## Commands

### `init`

Create or update the root `.env`:

```bash
lxp-setup init
```

This command:

- generates runtime secrets compatible with the current platform
- generates a setup token
- stores only `LXP_SETUP_TOKEN_HASH`
- prints the raw setup token once

### `doctor`

Validate the root `.env`:

```bash
lxp-setup doctor
```

## Local Workspace Usage

From the monorepo root:

```bash
pnpm setup:init
pnpm setup:doctor
```

## Published Package Usage

Once this package is published to your chosen npm-compatible registry, you can run it without cloning the repository, for example:

```bash
pnpm dlx @lxp/cli-setup init
pnpm dlx @lxp/cli-setup doctor
```

## Notes

- Keep the generated `.env` out of version control.
- Store the setup token immediately when it is shown.
- The raw setup token cannot be recovered from its hash later.
