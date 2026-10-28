#!/usr/bin/env bash
set -euo pipefail

# renovate: datasource=github-releases depName=googlefonts/noto-emoji
noto_version="2.051"
# renovate: datasource=github-releases depName=be5invis/Iosevka
iosevka_version="34.9.1"

fonts_dir="${HOME}/.local/share/fonts"
state_dir="${XDG_STATE_HOME:-${HOME}/.local/state}/dotfiles"
cache_dir="${XDG_CACHE_HOME:-${HOME}/.cache}"
marker="${state_dir}/fonts-versions"
expected=$(printf 'noto=%s\niosevka=%s' "$noto_version" "$iosevka_version")

if [[ -f "$marker" && "$(<"$marker")" == "$expected" && -s "${fonts_dir}/NotoColorEmoji.ttf" ]] &&
  [[ -n "$(find "${fonts_dir}/IosevkaTerm" -type f -name '*.ttf' -size +0c -print -quit 2>/dev/null)" ]]; then
  exit 0
fi

mkdir -p "$cache_dir" "$fonts_dir" "$state_dir"
stage=$(mktemp -d "${cache_dir}/dotfiles-fonts.XXXXXX")
new_dir=""
backup=""
noto_tmp=""
marker_tmp=""

# Restore the old managed directory if replacement did not complete.
cleanup() {
  if [[ -n "$backup" && -d "$backup" && ! -e "${fonts_dir}/IosevkaTerm" ]]; then
    if ! mv -- "$backup" "${fonts_dir}/IosevkaTerm"; then
      echo "Could not restore IosevkaTerm; backup is at ${backup}" >&2
      backup=""
    fi
  fi
  [[ -z "$new_dir" ]] || rm -rf -- "$new_dir"
  [[ -z "$backup" ]] || rm -rf -- "$backup"
  [[ -z "$noto_tmp" ]] || rm -f -- "$noto_tmp"
  [[ -z "$marker_tmp" ]] || rm -f -- "$marker_tmp"
  rm -rf -- "$stage"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

curl --fail --location --silent --show-error \
  "https://raw.githubusercontent.com/googlefonts/noto-emoji/v${noto_version}/fonts/NotoColorEmoji.ttf" \
  --output "${stage}/NotoColorEmoji.ttf"
curl --fail --location --silent --show-error \
  "https://github.com/be5invis/Iosevka/releases/download/v${iosevka_version}/PkgTTF-Unhinted-IosevkaTerm-${iosevka_version}.zip" \
  --output "${stage}/iosevka.zip"

mkdir "${stage}/iosevka"
unzip -j -q "${stage}/iosevka.zip" '*.ttf' -d "${stage}/iosevka"

for font in "${stage}/NotoColorEmoji.ttf" "${stage}"/iosevka/*.ttf; do
  if [[ ! -s "$font" || -z "$(fc-scan --format '%{family}' "$font")" ]]; then
    echo "Invalid font: ${font}" >&2
    exit 1
  fi
done

# Prepare replacements on the destination filesystem before moving existing fonts.
new_dir=$(mktemp -d "${fonts_dir}/.IosevkaTerm.new.XXXXXX")
cp -- "${stage}"/iosevka/*.ttf "$new_dir/"
chmod 755 "$new_dir"
chmod 644 "$new_dir"/*.ttf
noto_tmp=$(mktemp "${fonts_dir}/.NotoColorEmoji.XXXXXX")
cp -- "${stage}/NotoColorEmoji.ttf" "$noto_tmp"
chmod 644 "$noto_tmp"

# An incomplete replacement or cache refresh must be retried on the next run.
rm -f -- "$marker"
if [[ -e "${fonts_dir}/IosevkaTerm" ]]; then
  backup=$(mktemp -d "${fonts_dir}/.IosevkaTerm.backup.XXXXXX")
  rmdir -- "$backup"
  mv -- "${fonts_dir}/IosevkaTerm" "$backup"
fi
mv -- "$new_dir" "${fonts_dir}/IosevkaTerm"
new_dir=""
mv -f -- "$noto_tmp" "${fonts_dir}/NotoColorEmoji.ttf"
noto_tmp=""
if [[ -n "$backup" ]]; then
  rm -rf -- "$backup"
  backup=""
fi

fc-cache -f "$fonts_dir"
marker_tmp=$(mktemp "${state_dir}/.fonts-versions.XXXXXX")
printf '%s\n' "$expected" > "$marker_tmp"
mv -f -- "$marker_tmp" "$marker"
marker_tmp=""
