# fc-shell-integration (zprofile)
#
# See zshenv.zsh for the rationale on the trailing `:`.
{
  _fc_user_zdotdir="${FC_USER_ZDOTDIR:-$HOME}"
  [ -f "$_fc_user_zdotdir/.zprofile" ] && source "$_fc_user_zdotdir/.zprofile"
  unset _fc_user_zdotdir
}
:
