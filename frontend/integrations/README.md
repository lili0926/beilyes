# Eden private services

The Android frontend uses the existing `game` and `tavern` entries to open the
upstream CedarDuet and Afterhours interfaces. Their state stays on the owner's
VPS; the App never embeds the VPS access token or a model-provider key. In the
App, open 双弈 or Afterhours, enter the service URL and the installation's
connection code, then use the normal chat thread to invite the companion.

`gateway.py` is the only public service endpoint. CedarDuet, Afterhours, and
Lilt Echo bind to loopback behind it. The gateway serves the original UI files,
adds the in-memory `frame-bridge.js` for the App, and exposes authenticated
`/eden/tools`, `/eden/tool`, `/eden/context`, and `/eden/analysis` routes.
It fixes game identities to `local-human` and `local-ai`, sets virtual stakes
to zero, and exposes only the four requested games. The Mahjong variant uses
112 tiles with four red-center wildcards and self-draw winning; the rules are
displayed in the game UI. This is a local adaptation, not the upstream MCR
ruleset. A direct browser visit to the IP asks for the same connection code.

Lilt Echo analyzes only audio the user explicitly uploads (30 MB limit, first
12 minutes). Original audio is deleted after analysis. The tool exposes
acoustic measurements as evidence; it does not claim that the model heard the
audio or knows unprovided lyrics. The App's existing model configuration is
used for chat. The optional Claude Code channel can call
`python3 /opt/eden-services/client.py tools|context|call`; `call` reads a JSON
object with `name` and `arguments` from standard input.

The sample deployment assumes Python 3.12, Node 24, Nginx, and systemd. Copy
this directory to `/opt/eden-services`, install `requirements.txt` in a
private virtual environment, generate a random `EDEN_ACCESS_TOKEN` in a
mode-600 environment file, and run `deploy.py` as an administrator. Do not
commit the environment file or the persistent `data/` directory. The phone
currently connects to `http://43.142.110.120/eden` while the owner's domain
block is resolved; switch to HTTPS on the domain once available.

Upstream source snapshots and their license files are retained under `vendor/`:

- [CedarDuet](https://github.com/Zizuixixiang/cedarduet), commit
  `e9a15333b1c12deee0309fd0145cefd8914a34f7`, Copyright © 2026 南山君,
  PolyForm Noncommercial 1.0.0. The game catalog and Mahjong rules are adapted.
- [drink-with-your-ai / 和小机喝一杯](https://github.com/mamo0521/drink-with-your-ai),
  tree `34d155a3f0e944921b33e2eb828cc908072130b1`, Copyright © 2026 mamo.
  Code: PolyForm Noncommercial 1.0.0; creative text and artwork: CC BY-NC-SA
  4.0. Its bundled font, audio, and third-party notices are retained with the
  original files. The original page and interactions are served intact.
- [Lilt Echo](https://github.com/akinia0315/lilt-echo), commit
  `588fd8112cfc26485a6529d29b28176fb9b8679b`, MIT license. Its original
  analysis script processes user-provided audio on the VPS.

The two PolyForm and CC licenses restrict commercial use. Retaining upstream
files is intentional so their attribution, notices, and behavior stay with
the integration.
