# Third-Party Notices

Pawcast desktop distributions bundle FFmpeg and FFprobe executables prepared
from the following npm packages:

- `@ffmpeg-installer/ffmpeg` 1.1.0
- `@ffprobe-installer/ffprobe` 2.1.2

Those packages identify their distributed binaries as licensed under the GNU
Lesser General Public License version 2.1 (LGPL-2.1). FFmpeg builds can vary by
platform; release owners must inspect each packaged executable with
`ffmpeg -version` and `ffprobe -version` and satisfy the license configuration
reported by that binary.

The LGPL-2.1 license text is available at
<https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html>. FFmpeg source and
build information are available at <https://ffmpeg.org/>.

The application communicates with these executables as separate processes.
They are copied unchanged into the desktop bundle by
`scripts/prepare-sidecars.mjs`.
