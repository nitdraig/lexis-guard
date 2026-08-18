#compdef lexisg-cli lexisguard

_lexisguard() {
  local -a opts
  opts=(
    '--config[path to the configuration file]:file:_files'
    '--mode[execution mode: safe or aggressive]:mode:(safe aggressive)'
    '--target[base URL of the API to audit]:url:'
    '--spec[path or URL to an OpenAPI spec]:file:_files'
    '--format[report format]:format:(json md sarif html)'
    '--output[output path for the report]:file:_files'
    '--json[JSON output to stdout]'
    '--tui[open the interactive workbench]'
    '--threshold[minimum CVSS score for exit code 1]:score:'
    '--allow-exploitation[run gated modules that send mutating or destructive payloads]'
    '--completion[print a shell completion script]:shell:(bash zsh fish powershell)'
    '--help[show help]'
    '--version[show version]'
  )
  _describe 'options' opts
}

_lexisguard "$@"
