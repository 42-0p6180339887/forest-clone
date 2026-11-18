param(
    [Parameter(Mandatory)][string] $InputApk,
    [Parameter(Mandatory)][string] $OutputApk,
    [Parameter(Mandatory)][string] $SigningDirectory,
    [Parameter(Mandatory)][string] $Toolchain
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$java = (Get-ChildItem -Path (Join-Path $Toolchain 'jdk/*/bin/java.exe') -File | Select-Object -Last 1).FullName
$signer = (Get-ChildItem -Path (Join-Path $Toolchain 'build-tools/*/lib/apksigner.jar') -File | Select-Object -Last 1).FullName
$sdk = Split-Path (Split-Path $signer)
$aapt = Join-Path $sdk 'aapt2.exe'
$align = Join-Path $sdk 'zipalign.exe'
$inputFile = (Get-Item -LiteralPath $InputApk).FullName
$outputFile = [IO.Path]::GetFullPath($OutputApk)
$signDir = [IO.Path]::GetFullPath($SigningDirectory)
$store = Join-Path $signDir 'forest-privateupdates.p12'
$lock = Join-Path $signDir 'passphrase.dpapi'
$cert = Join-Path $signDir 'certificate.der'
$alias = 'forest-privateupdates'
$envVar = 'FOREST_LOCAL_RELEASE_KEY_PASSWORD'
if (Test-Path -LiteralPath $outputFile) { throw 'Choose a new versioned output path; the existing file is preserved.' }
if ([Environment]::GetEnvironmentVariable($envVar, 'Process')) { throw 'The signing password environment slot is already in use.' }
$badging = & $aapt dump badging $inputFile
if ($LASTEXITCODE -or $badging[0] -notmatch "^package: name='com\.wenhao\.forestclone\.privateupdates' versionCode='([1-9][0-9]*)' versionName='([^']+)'") {
    throw 'Only the Forest parallel-migration app may be signed here.'
}
$versionCode = [int]$Matches[1]
$versionName = $Matches[2]
& $align -c 4 $inputFile
if ($LASTEXITCODE) { throw 'Input package is not zip-aligned.' }

foreach ($file in @($store, $lock, $cert)) {
    if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw 'Restore the original Forest signer and protected passphrase.' }
}
$fingerprint = (Get-FileHash -LiteralPath $cert -Algorithm SHA256).Hash.ToLowerInvariant()
if ($fingerprint -ne '466e9d141d05adbb2380e64077a6fa7392ee2a10506b82a64ffad56f89f18ac1') {
    throw 'This signing directory does not contain the official Forest migration certificate.'
}
$random = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($lock), $null, 'CurrentUser')
[Environment]::SetEnvironmentVariable($envVar, [Convert]::ToBase64String($random), 'Process')
[Array]::Clear($random, 0, $random.Length)
$part = "$outputFile.$([guid]::NewGuid().ToString('N')).apk"
try {
    & $java '-Xmx80m' '-XX:ActiveProcessorCount=1' -jar $signer sign --ks $store --ks-key-alias $alias --ks-pass "env:$envVar" --v4-signing-enabled false --out $part $inputFile
    if ($LASTEXITCODE) { throw 'APK signing failed.' }
    $report = & $java '-Xmx80m' '-XX:ActiveProcessorCount=1' -jar $signer verify --verbose --print-certs $part
    if ($LASTEXITCODE -or !($report -contains "Signer #1 certificate SHA-256 digest: $fingerprint") -or
        !($report -match '^Verified using v2 scheme.*: true$') -or !($report -match '^Verified using v3 scheme.*: true$')) {
        throw 'The signed APK does not match the registered Forest certificate.'
    }
    [IO.File]::Move($part, $outputFile)
    [pscustomobject]@{PackageName='com.wenhao.forestclone.privateupdates'; VersionCode=$versionCode;
        VersionName=$versionName; SigningCertificateSha256=$fingerprint;
        FileSha256=(Get-FileHash -LiteralPath $outputFile -Algorithm SHA256).Hash.ToLowerInvariant();
        Bytes=(Get-Item -LiteralPath $outputFile).Length}
} finally {
    [Environment]::SetEnvironmentVariable($envVar, $null, 'Process')
    if (Test-Path -LiteralPath $part) { Remove-Item -LiteralPath $part }
}
