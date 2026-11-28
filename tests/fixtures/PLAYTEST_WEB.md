# Historical executable fixtures · RC-QA-01

These archives contain only our game's public WebView payload extracted from previously delivered APKs, including our own artwork/font licences. They contain no keystore, save, advertising SDK or competitor asset. They are test inputs outside Vite's product entry graph. CI checks their SHA-256 before extraction.

| Archive | Delivered APK version | APK SHA-256 | Web archive SHA-256 |
| --- | --- | --- | --- |
| playtest526-web.zip | 0.5.26 / 31, D4 + content/League pilot | 561be8d8045893dce17b6dd6632faa3b01e73da285fce249dec70f964997fc20 | d13cfba3a0c30d8e5265af5cca39e78bf800696615d299abb69ed316f20ce5bc |
| playtest527-web.zip | 0.5.27 / 32, integrated RC | d2dba24f4a3134ba8382cc8491d04b37c43fcd50b68989e2526a6f1c13c46977 | c3dbe3044b1b9b4da1d70af3d9a12a88239dfcb9889e4153dcb4aedc2bf6ce46 |

`tools/rc30-baselines.mjs` separately creates historical model-assisted profiles using the old engine/session/repository at explicit Git commits. The corresponding real old executable then loads, validates and writes them through actual UI actions before code is replaced at the same origin with storage retained. Rebuilt League v1/v2/v3 executables use their original `league-lab` profile; the delivered 0.5.26/0.5.27 web archives take precedence where present. An exact source-to-APK byte match is not assumed for 0.5.26; the artifact and model-source provenance remain separate in the report. This is a browser upgrade test, not APK installation or a physical-phone claim.
