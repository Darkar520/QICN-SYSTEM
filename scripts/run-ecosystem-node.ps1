param(
  [Parameter(Mandatory = $true)]
  [string]$NodeScript
)

$ErrorActionPreference = 'Stop'

$systemRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$releaseRoot = Resolve-Path (Join-Path $systemRoot '..\release_repo_qicn_2026-03-01')
$targetScript = Join-Path $PSScriptRoot $NodeScript

function Set-RepoEnv {
  param(
    [string]$RepoPath,
    [string]$Prefix
  )

  $gitBaseArgs = @('-c', ("safe.directory={0}" -f $RepoPath), '-C', $RepoPath)

  $branch = (& git @gitBaseArgs rev-parse --abbrev-ref HEAD).Trim()
  $head = (& git @gitBaseArgs rev-parse HEAD).Trim()
  $status = & git @gitBaseArgs status --porcelain
  $clean = [string]::IsNullOrWhiteSpace(($status | Out-String))

  $upstream = ''
  try {
    $upstream = (& git @gitBaseArgs rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null).Trim()
  } catch {
    $upstream = ''
  }

  $upstreamHead = ''
  if ($upstream) {
    try {
      $upstreamHead = (& git @gitBaseArgs rev-parse '@{u}' 2>$null).Trim()
    } catch {
      $upstreamHead = ''
    }
  }

  $remote = if ($upstream) { ($upstream -split '/')[0] } else { 'origin' }
  $remoteUrl = ''
  try {
    $remoteUrl = (& git @gitBaseArgs config --get ("remote.{0}.url" -f $remote) 2>$null).Trim()
  } catch {
    $remoteUrl = ''
  }

  Set-Item -Path ("Env:{0}_BRANCH" -f $Prefix) -Value $branch
  Set-Item -Path ("Env:{0}_HEAD" -f $Prefix) -Value $head
  Set-Item -Path ("Env:{0}_UPSTREAM" -f $Prefix) -Value $upstream
  Set-Item -Path ("Env:{0}_UPSTREAM_HEAD" -f $Prefix) -Value $upstreamHead
  Set-Item -Path ("Env:{0}_REMOTE" -f $Prefix) -Value $remote
  Set-Item -Path ("Env:{0}_REMOTE_URL" -f $Prefix) -Value $remoteUrl
  Set-Item -Path ("Env:{0}_CLEAN" -f $Prefix) -Value ($(if ($clean) { 'true' } else { 'false' }))
  Set-Item -Path ("Env:{0}_PUSHED" -f $Prefix) -Value ($(if ($upstreamHead -and $upstreamHead -eq $head) { 'true' } else { 'false' }))
}

Set-RepoEnv -RepoPath $systemRoot -Prefix 'ECO_SYSTEM'
Set-RepoEnv -RepoPath $releaseRoot -Prefix 'ECO_RELEASE'

& node $targetScript
exit $LASTEXITCODE
