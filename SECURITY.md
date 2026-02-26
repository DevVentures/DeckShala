# Security Policy

## Supported Versions

We actively support the latest major release with security updates.

| Version | Supported              |
| ------- | ---------------------- |
| 1.x.x   | ✅ Active support      |
| < 1.0   | ❌ No longer supported |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub Issues.**

If you discover a security vulnerability in DeckShala, please report it responsibly:

1. **GitHub Private Vulnerability Reporting** — Use the [Security Advisories](https://github.com/DevVentures/DeckShala/security/advisories/new) feature on GitHub to report privately.
2. **Discord** — Reach out to a maintainer directly via [Discord](https://discord.gg/fsMHMhAHRV).

### What to include in your report

- A description of the vulnerability and its potential impact
- Detailed steps to reproduce the issue
- Any proof-of-concept or exploit code (if applicable)
- Your suggested fix or mitigation (if you have one)

### What to expect

- **Acknowledgement** within 48 hours of your report
- **Status update** within 7 days with our assessment
- **Resolution** for valid vulnerabilities within 30–90 days (depending on complexity)
- **Credit** in the release notes (if you wish)

## Security Best Practices for Self-Hosters

When deploying DeckShala, follow these security recommendations:

- **Use strong, unique secrets** for `NEXTAUTH_SECRET` and all API keys
- **Never expose `.env`** files or secrets in version control
- **Rotate credentials** regularly, especially after a suspected compromise
- **Keep dependencies updated** — run `pnpm audit` regularly
- **Use HTTPS** in production — never serve the app over plain HTTP
- **Restrict database access** — use a dedicated DB user with minimal permissions
- **Enable rate limiting** on your reverse proxy (nginx/Caddy/Cloudflare)

## Dependency Security

We use automated scanning for known vulnerabilities:

- `pnpm audit` is run as part of the CI pipeline
- Dependabot is configured to open PRs for dependency updates

Thank you for helping keep DeckShala and its users safe!
