#!/usr/bin/env bash
# Deprecate the old (pre-rename) npm packages, pointing users to the new names.
# Usage: pnpm run deprecate-old -- <OTP>
#   <OTP> = current npm 2FA one-time password (required; npm deprecate is a write op).
set -euo pipefail

OTP="${1:-}"
if [ -z "$OTP" ]; then
  echo "usage: pnpm run deprecate-old -- <OTP>   (OTP = npm 2FA one-time password)" >&2
  exit 2
fi

deprecate() {
  local old="$1" new="$2"
  echo "→ deprecating $old -> $new"
  npm deprecate "$old" "Moved to $new" --otp="$OTP"
}

deprecate "@cuongph.dev/backlog-mcp" "@cuongph.dev/mcp-backlog"
deprecate "@cuongph.dev/jira-mcp"    "@cuongph.dev/mcp-jira"
deprecate "@cuongph.dev/chatops-mcp" "@cuongph.dev/mcp-chatops"

echo "✅ done"
