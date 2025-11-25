# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Redline seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to the maintainers. You can find contact information in the repository's maintainers list.

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, command injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### What to Expect

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will send a more detailed response within 7 days indicating the next steps
- We will keep you informed of the progress towards a fix and full announcement
- We may ask for additional information or guidance

### Safe Harbor

We consider security research conducted according to this policy to constitute "authorized" conduct and will not pursue civil or legal action against you. We ask that you:

- Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our service
- Only interact with your own accounts or test accounts for security research purposes
- Do not access, modify, or delete data that does not belong to you

## Security Considerations for Users

### Local Network Exposure

When Redline's HTTP server is running, it listens on `127.0.0.1:6380`. This means:

- ✅ Only accessible from your local machine
- ✅ Not exposed to the network
- ⚠️ Other processes on your machine could potentially access it

### Browser Security

The review interface runs in your default web browser:

- ✅ Standard browser security model applies
- ✅ No external network requests are made
- ✅ Content is rendered locally

### Data Handling

- Redline processes markdown content in memory
- No data is stored persistently
- No telemetry or analytics are collected
- All data stays on your local machine

## Known Limitations

1. **Port Hardcoded**: The server always runs on port 6380. If another process is using this port, Redline will fail to start.

2. **No Authentication**: The local HTTP server has no authentication. Any process on the local machine can access it when running.

3. **Single User**: Redline is designed for single-user local use, not multi-user or networked deployments.

## Acknowledgments

We appreciate the security research community and will acknowledge reporters in our release notes (unless they prefer to remain anonymous).
