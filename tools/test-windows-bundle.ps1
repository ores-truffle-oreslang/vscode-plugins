# Windows filesystem smoke for portable grammar ZIP layout.
# This does not launch Visual Studio or IntelliJ and must not be used as GUI proof.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$source = Join-Path $root 'syntaxes/oreslang.tmLanguage.json'
$packageDir = Join-Path $root 'dist/editor-packages'
$visualZip = Join-Path $packageDir 'oreslang-visual-studio-textmate.zip'
$jetbrainsZip = Join-Path $packageDir 'oreslang-intellij-textmate.zip'
foreach ($file in @($source, $visualZip, $jetbrainsZip)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "Expected editor package input missing: $file"
    }
}

$workspace = Join-Path $env:RUNNER_TEMP ('oreslang-editor-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $workspace | Out-Null
try {
    $vsRoot = Join-Path $workspace 'visual-studio'
    $ijRoot = Join-Path $workspace 'intellij'
    Expand-Archive -LiteralPath $visualZip -DestinationPath $vsRoot -Force
    Expand-Archive -LiteralPath $jetbrainsZip -DestinationPath $ijRoot -Force

    $vsGrammar = Join-Path $vsRoot 'Oreslang/Syntaxes/oreslang.tmLanguage.json'
    $ijBundle = Join-Path $ijRoot 'Oreslang-vscode-bundle'
    $ijGrammar = Join-Path $ijBundle 'syntaxes/oreslang.tmLanguage.json'
    $ijManifest = Join-Path $ijBundle 'package.json'
    foreach ($file in @($vsGrammar, $ijGrammar, $ijManifest)) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Expected extracted editor file missing: $file"
        }
    }
    $sha = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
    foreach ($file in @($vsGrammar, $ijGrammar)) {
        if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $sha) {
            throw "Extracted TextMate grammar does not match the canonical source: $file"
        }
    }

    $manifest = Get-Content -LiteralPath $ijManifest -Raw | ConvertFrom-Json
    if ($manifest.contributes.languages.Count -ne 1 -or
        $manifest.contributes.languages[0].id -ne 'oreslang' -or
        $manifest.contributes.languages[0].extensions.Count -ne 1 -or
        $manifest.contributes.languages[0].extensions[0] -ne '.ores' -or
        $manifest.contributes.grammars.Count -ne 1 -or
        $manifest.contributes.grammars[0].language -ne 'oreslang' -or
        $manifest.contributes.grammars[0].scopeName -ne 'source.oreslang' -or
        $manifest.contributes.grammars[0].path -ne './syntaxes/oreslang.tmLanguage.json') {
        throw 'Extracted IntelliJ VS Code-format bundle has incorrect language mapping'
    }

    $expectedVs = @('Oreslang/Syntaxes/oreslang.tmLanguage.json')
    $expectedIj = @('Oreslang-vscode-bundle/package.json',
                    'Oreslang-vscode-bundle/syntaxes/oreslang.tmLanguage.json')
    foreach ($entry in @(@{ dir=$vsRoot; expected=$expectedVs },
                        @{ dir=$ijRoot; expected=$expectedIj })) {
        $base = $entry.dir.TrimEnd('\', '/')
        $actual = @(Get-ChildItem -LiteralPath $base -File -Recurse | ForEach-Object {
            $_.FullName.Substring($base.Length).TrimStart('\', '/').Replace('\', '/')
        } | Sort-Object)
        if (@(Compare-Object -ReferenceObject $entry.expected -DifferenceObject $actual).Count -ne 0) {
            throw "Unexpected extracted archive members in $base"
        }
    }

    Write-Output "Windows ZIP extraction/layout and exact canonical grammar SHA-256 validated: $sha"
    Write-Output 'This check is not Visual Studio or IntelliJ GUI-host admission.'
} finally {
    Remove-Item -LiteralPath $workspace -Recurse -Force -ErrorAction SilentlyContinue
}
