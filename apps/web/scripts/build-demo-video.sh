#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEST="$ROOT/apps/web/public/videos/getstayguide-demo.mp4"
mkdir -p "$(dirname "$DEST")"
BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
if [[ ! -f "$BOLD" || ! -f "$REG" ]]; then echo "Missing DejaVu fonts" >&2; exit 1; fi
# This is an illustrated overview, not a recording of a customer account.
FILTER="drawbox=x=38:y=28:w=884:h=484:color=0x123941:t=fill,drawbox=x=55:y=45:w=850:h=450:color=0x0e2c33:t=fill,drawbox=x=55:y=45:w=850:h=7:color=0x38d7bb:t=fill,drawtext=fontfile=${BOLD}:text='StayGuide':fontsize=38:fontcolor=0x79f3d9:x=90:y=82,drawtext=fontfile=${REG}:text='Digital guest guides and AI concierge':fontsize=19:fontcolor=0xb5dad4:x=90:y=137,drawbox=x=90:y=445:w=780:h=4:color=0x42716b:t=fill,drawtext=fontfile=${REG}:text='getstayguide.com/tour':fontsize=20:fontcolor=0x79f3d9:x=90:y=476"
TITLES=(
"A BETTER STAY STARTS HERE"
"01  ADD YOUR PROPERTY"
"02  REVIEW YOUR GUIDE"
"03  PUBLISH AND SHARE"
"04  MULTILINGUAL GUIDES"
"05  AI CONCIERGE"
"06  INBOX AND EXTRAS"
"START A 14-DAY PRO TRIAL"
)
DETAILS=(
"A welcome guide guests can open on any device"
"Enter details and paste your house manual"
"Check arrival, Wi-Fi, house rules and checkout"
"Send guests a guide link or printable QR code"
"Guests can read in their preferred language"
"Answers based on your property guide"
"Manage guest questions and optional extras"
"One property. No card. No automatic charge."
)
for i in "${!TITLES[@]}"; do
  start=$((i * 4))
  end=$((start + 4))
  FILTER+=",drawtext=fontfile=${BOLD}:text='${TITLES[$i]}':fontsize=38:fontcolor=white:x=90:y=220:enable='between(t,${start},${end})'"
  FILTER+=",drawtext=fontfile=${REG}:text='${DETAILS[$i]}':fontsize=23:fontcolor=0xb5dad4:x=90:y=305:enable='between(t,${start},${end})'"
done
ffmpeg -hide_banner -loglevel error -y -f lavfi -i 'color=c=0x092b31:s=960x540:r=15:d=32' \
  -vf "$FILTER" -c:v libx264 -preset medium -crf 30 -pix_fmt yuv420p \
  -movflags +faststart "$DEST"
echo "Created $DEST"
