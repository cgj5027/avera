# Security policy

Avera is currently a Plaid Sandbox application. Local tests do not certify
hosted authorization, financial accuracy, storage retention or session security.
Do not use real bank credentials or personal financial documents for acceptance tests.

## Reporting a vulnerability

Use GitHub's **Security → Report a vulnerability** when private vulnerability
reporting is enabled. If unavailable, contact the repository owner privately
through an existing trusted channel. Do not put tokens, personal data or
exploit details in public issues. Include the affected commit, reproducible
steps using synthetic records, and the expected versus actual behavior.

The owner must enable private vulnerability reporting and supported secret
scanning/push protection in repository settings; adding this file does not
activate those GitHub features. No response-time commitment is specified.

## Security checks

The security workflow scans available Git history with checksum-pinned Gitleaks,
runs dependency audits and tests, and checks types/build output with read-only
repository permissions. Its two historical secret-scan exceptions identify
specific UI expressions, not credentials. Dependabot delays ordinary npm
updates seven days; security updates may follow different provider rules.
`npm ci` preserves the reviewed lockfile; manual updates need release/provenance review.

Backend SDK imports match the lockfile's reviewed frontend SDK version.
Any upgrade must update backend imports, local aliases and fixtures together.

See `docs/SECURITY_REMEDIATION.md` for deployed checks and remaining release gates.
