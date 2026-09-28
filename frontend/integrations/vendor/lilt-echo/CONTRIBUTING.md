# Contributing

Thank you for keeping this reference project safe to share.

Before opening a pull request:

- use synthetic fixtures only; never add real recordings, lyrics, chat logs,
  account data, screenshots, cookies, keys, or provider responses;
- keep microphone processing local unless the UI contains clear, separate
  consent for the exact data being sent;
- preserve the distinction between a derived full-mix reference contour and a
  vocal-stem or accuracy claim;
- keep measured acoustics, model-heard observations and written impressions
  distinct; never claim a synthetic fixture verifies real-song accuracy;
- keep model audio/text transmission explicitly opt-in and document exactly
  which data leaves the machine; do not silently retry paid requests;
- do not reintroduce shared-room features or private host-system dependencies;
- run the test commands in the README and `bash scripts/public-audit.sh`.

Issues and pull requests should redact personal data and security credentials.
