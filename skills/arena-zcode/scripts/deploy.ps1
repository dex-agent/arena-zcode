<#
.SYNOPSIS
Installs the arena-zcode skill and its agent lanes into ZCode's user directories.
.DESCRIPTION
Links skills/arena-zcode into ~/.zcode/skills/arena-zcode and copies the agent
definition files to ~/.zcode/agents/. The skill folder is self-contained: copying
it is copying the whole skill. Agent files do not hot-reload: start a NEW ZCode
session after deploying. With -Lane and -Model, also emits an extra worker lane
~/.zcode/agents/arena-<name>.md with the safe tools list (no Bash, no MCP, no web).
.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1
.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1 -Lane deepseek -Model "YOUR-PROVIDER-ID/deepseek/deepseek-v4-flash"
.PARAMETER Force
Replaces an existing skill link/dir at the destination.
.PARAMETER Lane
Lowercase name for an extra worker lane (letters, digits, dashes).
.PARAMETER Model
Model id from your ZCode provider catalog for the lane.
#>
# arena-zcode deploy: install the skill and the agent lanes into ZCode's user directories.
# The skill folder is self-contained: SKILL.md, bracket.py, rubric, strategies, agents and this
# script all live together, so copying the folder is copying the whole skill.
# -Lane/-Model emits an extra worker lane ~/.zcode/agents/arena-<name>.md with the safe tools
# list (no Bash, no MCP, no web) and injectAgentsMd false. Same model id in two lanes is cost,
# not diversity - pick different families.
param([switch]$Force, [string]$Lane, [string]$Model)

$ErrorActionPreference = "Stop"

$skillSource = Split-Path -Parent $PSScriptRoot
$agentsSource = Join-Path $skillSource "agents"

$zcodeHome = Join-Path $env:USERPROFILE ".zcode"
$skillDest = Join-Path $zcodeHome "skills\arena-zcode"
$agentsDest = Join-Path $zcodeHome "agents"

if (-not (Test-Path -LiteralPath (Join-Path $skillSource "SKILL.md"))) {
    throw "SKILL.md not found at $skillSource - deploy.ps1 must stay inside the skill's scripts folder."
}

if (Test-Path -LiteralPath $skillDest) {
    if ($Force) {
        $existing = Get-Item -LiteralPath $skillDest -Force
        if ($existing.LinkType -eq "SymbolicLink" -or $existing.PSIsContainer) {
            Remove-Item -LiteralPath $skillDest -Recurse -Force
        } else {
            Remove-Item -LiteralPath $skillDest -Force
        }
        Write-Host "replaced existing $skillDest"
    } else {
        throw "$skillDest already exists. Re-run with -Force to replace it."
    }
}

New-Item -ItemType SymbolicLink -Path $skillDest -Target $skillSource | Out-Null
Write-Host "skill linked: $skillDest -> $skillSource"

if (-not (Test-Path -LiteralPath $agentsDest)) { New-Item -ItemType Directory -Path $agentsDest | Out-Null }
Copy-Item -Path (Join-Path $agentsSource "*.md") -Destination $agentsDest -Force
Write-Host "agents copied to $agentsDest"

if ($Lane -and $Model) {
    if ($Lane -notmatch '^[a-z0-9-]+$') { throw "Lane name must be lowercase letters/digits/dashes: $Lane" }
    $lanePath = Join-Path $agentsDest ("arena-{0}.md" -f $Lane)
    $laneBody = @(
        '---',
        ('name: "arena-{0}"' -f $Lane),
        ('description: "arena-zcode worker lane {0} on {1}. Follows the brief file exactly."' -f $Lane, $Model),
        'color: blue',
        ('model: "{0}"' -f $Model),
        'thoughtLevel: high',
        'injectAgentsMd: false',
        'tools:',
        '  - Read',
        '  - Grep',
        '  - Glob',
        '  - Write',
        '  - Edit',
        '---',
        '',
        'You are an arena worker. Your whole job is in the brief file you were told to read: follow it',
        'exactly, write only the files it names inside the arena directory, and reply with only the one',
        'line it asks for. Do not load skills, memories or any other context: the brief is everything.',
        'No Bash, no MCP tools, no web: read and write files only.'
    ) -join "`r`n"
    [IO.File]::WriteAllText($lanePath, $laneBody + "`r`n")
    Write-Host "lane written: $lanePath"
} elseif ($Lane -xor $Model) {
    throw "-Lane and -Model go together."
}

Write-Host ""
Write-Host "Done. Agent definition files do not hot-reload:"
Write-Host "start a NEW ZCode session, then invoke with:" -NoNewline; Write-Host ' $arena-zcode <task>'
Write-Host "Model ids in the agent files follow this machine's provider catalog;"
Write-Host "edit agents\*.md if your configured models differ."
