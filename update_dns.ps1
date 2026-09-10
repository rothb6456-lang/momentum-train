[CmdletBinding()]
param(
    [string]$ApiToken = $env:CF_API_TOKEN,
    [string]$Domain = 'bulldogstats.com',
    [string]$RecordName = 'statbook.bulldogstats.com',
    [string]$TargetIp = '75.119.204.175'
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ApiToken)) {
    throw 'Set CF_API_TOKEN or pass -ApiToken. Do not store the token in this file.'
}

$headers = @{ Authorization = "Bearer $ApiToken" }
$zoneResponse = Invoke-RestMethod -Method Get `
    -Uri "https://api.cloudflare.com/client/v4/zones?name=$Domain&status=active" `
    -Headers $headers

if (-not $zoneResponse.success -or $zoneResponse.result.Count -ne 1) {
    throw "Could not resolve exactly one active Cloudflare zone for $Domain."
}

$zoneId = $zoneResponse.result[0].id
$recordResponse = Invoke-RestMethod -Method Get `
    -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?type=A&name=$RecordName" `
    -Headers $headers

if (-not $recordResponse.success -or $recordResponse.result.Count -ne 1) {
    throw "Could not resolve exactly one A record for $RecordName."
}

$recordId = $recordResponse.result[0].id
$payload = @{
    type    = 'A'
    name    = $RecordName
    content = $TargetIp
    ttl     = 1
    proxied = $false
} | ConvertTo-Json

$updateResponse = Invoke-RestMethod -Method Put `
    -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId" `
    -Headers ($headers + @{ 'Content-Type' = 'application/json' }) `
    -Body $payload

if (-not $updateResponse.success) {
    throw "Cloudflare rejected the DNS update: $($updateResponse.errors | ConvertTo-Json -Depth 5 -Compress)"
}

Write-Host "Updated $RecordName to $TargetIp with DNS-only routing."