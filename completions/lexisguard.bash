# LexisGuard bash completion
_lexisguard() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local opts="--config --mode --target --spec --format --output --json --tui --threshold --allow-exploitation --completion --help --version"
  local formats="json md sarif html"
  local modes="safe aggressive"

  if [[ "${COMP_WORDS[COMP_CWORD-1]}" == "--format" ]]; then
    COMPREPLY=( $(compgen -W "${formats}" -- "${cur}") )
    return 0
  fi

  if [[ "${COMP_WORDS[COMP_CWORD-1]}" == "--mode" ]]; then
    COMPREPLY=( $(compgen -W "${modes}" -- "${cur}") )
    return 0
  fi

  if [[ "${COMP_WORDS[COMP_CWORD-1]}" == "--completion" ]]; then
    COMPREPLY=( $(compgen -W "bash zsh fish powershell" -- "${cur}") )
    return 0
  fi

  COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
  return 0
}

complete -F _lexisguard lexisg-cli
complete -F _lexisguard lexisguard
