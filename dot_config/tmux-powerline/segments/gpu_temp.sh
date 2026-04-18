# shellcheck shell=bash
# Prints GPU temperature (AMD discrete GPU via lm_sensors)

run_segment() {
	# Only show discrete GPU temp on hosts with an AMD dGPU
	[[ "$(hostname -s)" == "amdbox" ]] || return 1

	local temp
	temp=$(sensors amdgpu-pci-0300 2>/dev/null | grep '^edge:' | awk '{print $2}' | tr -d '+°C')

	if [ -n "$temp" ]; then
		echo "󰢮 ${temp}°"
		return 0
	else
		return 1
	fi
}
