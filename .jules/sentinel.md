## 2026-11-10 - [Added strict Content Security Policy (CSP) for Tauri]
**Vulnerability:** The application had an intentionally disabled Content Security Policy (`csp: null`) in `tauri.conf.json`.
**Learning:** By leaving CSP as null in a Tauri application, the webview lacks crucial protections against Cross-Site Scripting (XSS). If an XSS vulnerability exists, an attacker could potentially gain Remote Code Execution (RCE) via Tauri IPC bindings or exfiltrate sensitive data without restriction.
**Prevention:** Always define a strict Content Security Policy for Tauri applications, ensuring directives like `default-src`, `script-src`, and `connect-src` restrict access only to trusted origins and necessary IPC endpoints.
