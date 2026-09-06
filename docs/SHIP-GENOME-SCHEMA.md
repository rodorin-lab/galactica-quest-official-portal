# 🧬 GALACTICA Ship Genome Schema v1

## 概要
艦船を「完成品」ではなく「設計DNA」として保存する。1隻の標本から、
役割(Role)+文明(Faction)+時代(Era)+技術(Tech)を掛け合わせて無限の派生艦を生成する。

## 4層DNA構造

| 層 | 保存内容 | 用途 |
|---|---|---|
| **Visual DNA** | シルエット・色・武装配置・推進器・装甲の見た目 | 3D生成の基礎 |
| **Functional DNA** | サブシステム配分・性能スコア・戦闘ドクトリン | 性能計算とバランス検証 |
| **Cultural DNA** | 文明・設計哲学・美学バイアス | 文明ごとの再設計の指針 |
| **Evolution DNA** | 変異可能/禁止項目・既知の弱点・進化フック | Mk.II以降の系統樹生成 |

## パイプライン
SOURCE ASSET → VISION ANALYZE → DESIGN DNA JSON → DNA NORMALIZER
→ GALACTICA SHIP GENOME → (ROLE+FACTION+ERA+TECH) → FORGE
→ BLUEPRINT JSON → VALIDATOR → SHIP REGISTRY → CHRONICLE

## 進化ループ (SHIP EVOLUTION LOOP)
戦闘 → 性能ログ → AI解析 → 弱点発見 → 改良設計 → Mk.II → 派生艦

`lineage.parent_id` で系統樹を記録。全ての進化史が CHRONICLE に刻まれる。

## 初代標本
`data/ship-genomes/sr2_heavy_gunship_001.json` — Star Ruler 2 の Heavy Gunship。
設計図ファイル(.design)を直接解析した完全DNA。100万隻の祖先。

## ライセンス注記
- Star Ruler 2 のコード: MIT
- Star Ruler 2 のアセット: CC-BY-NC 2.0 (非商用)
- 将来的に商用化する際は GALACTICA 自前艦へ置換
- この Genome JSON 自体は GALACTICA 独自データ (派生物ではない設計解析)
