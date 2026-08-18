# LexisGuard PowerShell completion
Register-ArgumentCompleter -Native -CommandName lexisg-cli, lexisguard -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)

  $options = @(
    '--config', '--mode', '--target', '--spec', '--format',
    '--output', '--json', '--tui', '--threshold', '--allow-exploitation',
    '--completion', '--help', '--version'
  )

  $previous = $commandAst.CommandElements |
    Where-Object { $_.ToString().StartsWith('-') } |
    Select-Object -Last 1

  switch ($previous) {
    '--format' { @('json', 'md', 'sarif', 'html') | Where-Object { $_ -like "$wordToComplete*" } }
    '--mode' { @('safe', 'aggressive') | Where-Object { $_ -like "$wordToComplete*" } }
    '--completion' { @('bash', 'zsh', 'fish', 'powershell') | Where-Object { $_ -like "$wordToComplete*" } }
    default { $options | Where-Object { $_ -like "$wordToComplete*" } }
  }
}
