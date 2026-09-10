[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$SshUser,
    [string]$SshHost = '75.119.204.175',
    [string]$ProjectPath = '~/statbook.bulldogstats.com',
    [string]$IdentityFile
)

$ErrorActionPreference = 'Stop'

foreach ($command in @('ssh', 'scp')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $command"
    }
}

$sshArguments = @('-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new')
if ($IdentityFile) {
    $sshArguments += @('-i', $IdentityFile)
}

$remote = "$SshUser@$SshHost"
$tempFile = Join-Path ([IO.Path]::GetTempPath()) ([IO.Path]::GetRandomFileName())
$htaccess = @'
<IfModule mod_rewrite.c>
    RewriteEngine On

    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.php [L]
</IfModule>
'@

try {
    [IO.File]::WriteAllText($tempFile, $htaccess, [Text.UTF8Encoding]::new($false))

    & scp @sshArguments $tempFile "${remote}:$ProjectPath/public/.htaccess"
    if ($LASTEXITCODE -ne 0) {
        throw 'scp failed while uploading public/.htaccess.'
    }

    $remoteScript = @'
set -eu
cd "$1"
php artisan route:list --path=v1
php artisan route:clear
php artisan config:clear
php artisan cache:clear
printf '\n=== .htaccess ===\n'
cat public/.htaccess
printf '\n=== Required POST routes ===\n'
route_output=$(php artisan route:list --path=v1 --method=POST)
printf '%s\n' "$route_output"
printf '%s\n' "$route_output" | grep -q 'api/v1/training/sessions'
printf '%s\n' "$route_output" | grep -q 'api/v1/training/coach/generate-card'
printf '%s\n' "$route_output" | grep -Eq 'api/v1/auth/(login|token)'
'@
    $encodedScript = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remoteScript))
    $command = "echo $encodedScript | base64 -d | sh -s -- '$ProjectPath'"

    & ssh @sshArguments $remote $command
    if ($LASTEXITCODE -ne 0) {
        throw 'Remote Laravel verification failed. Check the route output above.'
    }
}
finally {
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}