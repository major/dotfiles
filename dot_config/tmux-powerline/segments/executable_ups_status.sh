# shellcheck shell=bash
# Prints UPS battery percentage and status via NUT (upsc)

run_segment() {
	# Only show UPS status on hosts with a connected UPS
	[[ "$(hostname -s)" == "amdbox" ]] || return 1

	local charge ups_state watts runtime icon mins
	charge=$(upsc cyberpower battery.charge 2>/dev/null)
	ups_state=$(upsc cyberpower ups.status 2>/dev/null)
	watts=$(upsc cyberpower ups.realpower 2>/dev/null)
	runtime=$(upsc cyberpower battery.runtime 2>/dev/null)

	if [ -z "$charge" ]; then
		return 1
	fi

	case "$ups_state" in
		*OB*) icon="󱐤" ;;   # on battery
		*CHRG*) icon="󰂄" ;; # charging
		*) icon="󰂄" ;;      # online/full
	esac

	mins=$((runtime / 60))
	echo "${icon} ${charge}% ${watts}W ${mins}m"
	return 0
}
