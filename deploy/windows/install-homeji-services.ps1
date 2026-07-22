[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $BackendPublishPath,

    [Parameter(Mandatory = $true)]
    [string] $FrontendPath,

    [string] $NssmPath = 'C:\tools\nssm\win64\nssm.exe',
    [string] $DotnetPath = 'dotnet.exe',
    [string] $NodePath = 'node.exe',
    [string] $ApiUrl = 'http://127.0.0.1:8080',
    [string] $WebPort = '3000',
    [string] $ApiProxyTarget = 'http://127.0.0.1:8080'
)

$ErrorActionPreference = 'Stop'

function Assert-Path([string] $Path, [string] $Description) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Description not found: $Path"
    }
}

Assert-Path $NssmPath 'NSSM executable'
Assert-Path $BackendPublishPath 'BE publish directory'
Assert-Path $FrontendPath 'FE directory'
Assert-Path (Join-Path $BackendPublishPath 'Homeji.Api.dll') 'BE assembly'
Assert-Path (Join-Path $FrontendPath 'dist\index.html') 'FE build output'

$nssm = (Resolve-Path -LiteralPath $NssmPath).Path
$backend = (Resolve-Path -LiteralPath $BackendPublishPath).Path
$frontend = (Resolve-Path -LiteralPath $FrontendPath).Path

function Install-NssmService(
    [string] $Name,
    [string] $Application,
    [string] $Arguments,
    [string] $WorkingDirectory,
    [hashtable] $Environment
) {
    & $nssm stop $Name 2>$null | Out-Null
    & $nssm remove $Name confirm 2>$null | Out-Null
    & $nssm install $Name $Application $Arguments
    & $nssm set $Name AppDirectory $WorkingDirectory
    & $nssm set $Name Start SERVICE_AUTO_START
    & $nssm set $Name AppExit Default Restart
    & $nssm set $Name AppStdout "C:\apps\homeji-logs\$Name.out.log"
    & $nssm set $Name AppStderr "C:\apps\homeji-logs\$Name.err.log"

    if ($Environment) {
        $pairs = $Environment.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
        & $nssm set $Name AppEnvironmentExtra $pairs
    }

    & $nssm start $Name
}

New-Item -ItemType Directory -Force 'C:\apps\homeji-logs' | Out-Null

Install-NssmService `
    -Name 'HomejiApi' `
    -Application $DotnetPath `
    -Arguments "`"$backend\Homeji.Api.dll`" --urls $ApiUrl" `
    -WorkingDirectory $backend `
    -Environment @{
        ASPNETCORE_ENVIRONMENT = 'Production'
    }

Install-NssmService `
    -Name 'HomejiWeb' `
    -Application $NodePath `
    -Arguments 'scripts/serve-prod.mjs' `
    -WorkingDirectory $frontend `
    -Environment @{
        PORT = $WebPort
        API_PROXY_TARGET = $ApiProxyTarget
    }

Write-Host 'HomejiApi and HomejiWeb services installed and started.' -ForegroundColor Green
Write-Host 'Verify with: Get-Service HomejiApi, HomejiWeb'
