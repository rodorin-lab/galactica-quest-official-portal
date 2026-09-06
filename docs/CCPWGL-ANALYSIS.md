# 🛰 CCP WebGL Library 解析報告 (GALACTICA 統合用)

## 発見: EVE クライアントの 3D エンジンが JavaScript で公開されている

**ccpgames/ccpwgl** (106⭐, MIT, 公式) — EVE のグラフィックエンジンの WebGL 実装。

### 部品一覧 (src/eve/)
- EveSpaceObject / EveShip — 艦船・宇宙オブジェクト本体
- EveSOF (Space Object Factory) — **BuildFromDNA(dna)** で艦船を組み立て
- EveBoosterSet — ブースター(エンジン炎)
- EvePlaneSet — プレーン系エフェクト
- EveSpotlightSet — スポットライト
- EveSpriteSet — スプライト
- EveSpaceObjectDecal — デカール(艦船の紋章!)
- EveCurveLineSet — カーブライン(航路描画に使える!)

### 核心メソッド: BuildFromDNA(dna, callback)
DNA を渡すと艦船が構築される。Tech3複合艦と同じ方式。
→ わたくしたちの FORGE architecture JSON を **EVE DNA 形式に変換**すれば
   EVE クオリティの艦船・建築が生成される。

### 必要なアセット
EVE クライアントの res ファイル (SOF データ・メッシュ・テクスチャ)。
CCP の利用規約上、公式アセットの再配布は要注意。
→ GALACTICA では **独自の DNA + 独自メッシュ** を作る方針が安全。

### GALACTICA 統合プラン
1. ccpwgl を npm モジュールとして GALACTICA フロントに追加
2. FORGE の architecture JSON → EVE DNA 変換コンバータ (server側)
3. 部屋の 3D に ccpwgl 窓を追加 (Three.js と共存可能)
4. 独自 DNA ライブラリを GENESIS で無限生成
