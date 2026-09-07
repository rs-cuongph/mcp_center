#!/usr/bin/env bash
# Deprecate the old (pre-rename) npm packages, pointing users to the new names.
#
# Usage: pnpm run deprecate-old
#
# 2FA: this is a write op. With TOTP 2FA, npm prompts for a one-time code.
# With WebAuthn (security key / macOS passkey / Touch ID), npm opens a browser
# to approve each command — so run this in an interactive terminal, not CI.
# For unattended runs, authenticate with a granular/automation access token
# (NPM_TOKEN) instead; automation tokens bypass the 2FA prompt.
set -euo pipefail

deprecate() {
  local old="$1" new="$2"
  echo "→ deprecating $old -> $new"
  npm deprecate "$old" "Moved to $new"
}

deprecate "@cuongph.dev/backlog-mcp" "@cuongph.dev/mcp-backlog"
deprecate "@cuongph.dev/jira-mcp"    "@cuongph.dev/mcp-jira"
deprecate "@cuongph.dev/chatops-mcp" "@cuongph.dev/mcp-chatops"

echo "✅ done"
