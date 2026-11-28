# Historical executable fixtures · RC-QA-01

These archives contain only our game's public WebView payload extracted from previously delivered APKs, including our own artwork/font licences. They contain no keystore, save, advertising SDK or competitor asset. They are test inputs outside Vite's product entry graph. CI checks their SHA-256 before extraction.

| Archive | Delivered APK version | APK SHA-256 | Web archive SHA-256 |
| --- | --- | --- | --- |
| playtest526-web.zip | 0.5.26 / 31, D4 + content/League pilot | 561be8d8045893dce17b6dd6632faa3b01e73da285fce249dec70f964997fc20 | d13cfba3a0c30d8e5265af5cca39e78bf800696615d299abb69ed316f20ce5bc |
| playtest527-web.zip | 0.5.27 / 32, integrated RC | d2dba24f4a3134ba8382cc8491d04b37c43fcd50b68989e2526a6f1c13c46977 | c3dbe3044b1b9b4da1d70af3d9a12a88239dfcb9889e4153dcb4aedc2bf6ce46 |

`tools/rc30-baselines.mjs` separately creates historical model-assisted profiles using the old engine/session/repository at explicit Git commits. The corresponding real old executable then loads, validates and writes them through actual UI actions before code is replaced at the same origin with storage retained. Rebuilt League v1/v2/v3 executables use their original `league-lab` profile; the delivered 0.5.26/0.5.27 web archives take precedence where present. An exact source-to-APK byte match is not assumed for 0.5.26; the artifact and model-source provenance remain separate in the report. This is a browser upgrade test, not APK installation or a physical-phone claim.

## 0.5.28 / 33

`playtest528-web.zip`: SHA-256 `cb9c7b3f488c81ae4d2f760dcd2f71054f479995af8df438df07319862c80152`, public web extracted from delivered APK `aae1f10dfd607c2da8371019f6789b84e1ae55a13ec374142940924eb5847445`, source `4a76f388f9582c15d7f264914042b8a16c092706`. Same-signer native installation remains a separate gate. No signing material or competitor assets.

## 0.5.29 / 34

`playtest529-web.zip`: SHA-256 `dc478e55e4fa6f5db6ca69ff67e97617a447dc3b032d9be89ea1b40f460768e4`, extracted from delivered APK `0fde335c67cc27b05c9605c562b2245ee998fd3c8a485adecb2143e7ad7ea25f`, source `291cb971ec4c9a577851ada6a1c53dbf7d9b8fe2`. Logical old-code update only; native installation remains separate.

## 0.5.30 / 35

`playtest530-web.zip`: SHA-256 `04df85ae8c7bca3475c2a52528b1c8b432e49cabdf08cfe53ae39018708a81c9`, exact public web from delivered APK `fcb6dd771f29fc07db5dccf62229a2639960867d019f15d0c701a33644512060`, source `34adfa1d1a051bd8eab653061f62871e7881faaa`. No changes to the historical executable; native install/update remains a separate device gate.
