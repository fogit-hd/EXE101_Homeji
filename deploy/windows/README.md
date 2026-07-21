# Homeji on Windows Server

This deployment keeps the ASP.NET Core API and the Vite SPA private on loopback:

```text
public 80/443 -> Caddy -> FE 127.0.0.1:3000
                      └-> /api and /hubs -> BE 127.0.0.1:8080
```

## Server preparation

Install Node.js LTS, .NET 9 runtime, NSSM, and Caddy. Copy the backend publish output to
`C:\apps\homeji-be-publish` and the frontend repository (including `dist`) to
`C:\apps\homeji-fe`.

Build the applications before installing services:

```powershell
cd C:\apps\homeji-be
dotnet publish .\src\Homeji.Api\Homeji.Api.csproj -c Release -o C:\apps\homeji-be-publish

cd C:\apps\homeji-fe
npm ci
npm run build
```

Install the two services from an elevated PowerShell:

```powershell
cd C:\apps\homeji-fe
.\deploy\windows\install-homeji-services.ps1 `
  -BackendPublishPath C:\apps\homeji-be-publish `
  -FrontendPath C:\apps\homeji-fe
```

The script validates both build outputs, configures automatic restart, writes logs to
`C:\apps\homeji-logs`, and starts `HomejiApi` and `HomejiWeb`.

## Reverse proxy

Copy `Caddyfile` beside `caddy.exe`, then run Caddy as a Windows service. The checked-in
file uses the public IP and HTTP. Replace the site address with a DNS name to enable
automatic HTTPS, for example:

```caddyfile
homeji.example.com {
    encode gzip
    reverse_proxy /api/* 127.0.0.1:8080
    reverse_proxy /hubs/* 127.0.0.1:8080
    reverse_proxy 127.0.0.1:3000
}
```

Open only TCP 80 and 443 in Windows Firewall. Do not expose 3000 or 8080 publicly.

## Production configuration checklist

Set the backend's production configuration outside Git, then update Supabase redirect
URLs, CORS allowed origins, Google OAuth callbacks, and MoMo/PayOS callbacks to the final
public URL. Rotate any credentials that were ever committed to `appsettings.json`.
