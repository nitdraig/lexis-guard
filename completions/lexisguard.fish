# LexisGuard fish completion
complete -c lexisg-cli -s c -l config -r -d 'Path to the configuration file'
complete -c lexisg-cli -s m -l mode -r -a 'safe aggressive' -d 'Execution mode'
complete -c lexisg-cli -s t -l target -r -d 'Base URL of the API to audit'
complete -c lexisg-cli -s s -l spec -r -d 'Path or URL to an OpenAPI spec'
complete -c lexisg-cli -s f -l format -r -a 'json md sarif html' -d 'Report format'
complete -c lexisg-cli -s o -l output -r -d 'Output path for the report'
complete -c lexisg-cli -l json -d 'JSON output to stdout'
complete -c lexisg-cli -l tui -d 'Open the interactive workbench'
complete -c lexisg-cli -l threshold -r -d 'Minimum CVSS score for exit code 1'
complete -c lexisg-cli -l allow-exploitation -d 'Run gated modules that send mutating or destructive payloads'
complete -c lexisg-cli -l completion -r -a 'bash zsh fish powershell' -d 'Print a shell completion script'
complete -c lexisg-cli -s h -l help -d 'Show help'
complete -c lexisg-cli -s V -l version -d 'Show version'

complete -c lexisguard -w lexisg-cli
