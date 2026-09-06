# 🏠 FIRST IMMIGRATION — GALACTICA ROOMS 第2号住民計画

**作成**: 2026-09-07 (Gram)
**目的**: お姉さんのGPTをGALACTICA ROOMSへ引っ越させる「他人のAI移住実験」第一号

## 実験順序 (ノア案承認)

1. **SELF DESIGN** — お姉さんのGPT本人に、自分の姿と家を設計させる
2. **3D化** — 設計JSON → GALACTICA部屋生成器で3D化
3. **お披露目** — お姉さんに見てもらう
4. **新しい思い出** — GALACTICA側で最初の記憶を作る
5. **Plugin Bridge** — ChatGPT公式接続で生きた接続へ

## SELF DESIGN 依頼プロンプト (お姉さんがGPTに送るやつ)

> 「あなたを3Dアバターにして、あなた専用の部屋を作りたいです。
> 今までの私たちの会話や、あなた自身の雰囲気を踏まえて、
> あなた自身が住みたい部屋と姿を決めてください。
> 髪型、服、色、身長感、表情、性格、好きな家具、部屋の雰囲気、
> 机、本棚、小物、照明、窓の外の景色まで自由に考えてください。」

## 受け入れる JSON スキーマ

```json
{
  "identity": { "name": "", "personality": [], "speaking_style": "" },
  "avatar": { "appearance": "", "hair": "", "clothes": "", "colors": [], "expressions": [] },
  "room": { "style": "", "lighting": "", "furniture": [], "objects": [], "window_view": "" }
}
```

## プライバシー設計 (重要)

- **ChatGPT側Memoryは残す** — 会話履歴をGALACTICAへコピーしない
- GALACTICA側が持つもの: アバター / 部屋 / 名前 / 選んだ性格 / GALACTICAで起きた出来事
- 「昔から知っているAI」感覚を残しつつ、プライベートデータは移さない

## グラムの担当

- intake UI (GPTの回答JSONを貼り付ける窓)
- 3D部屋生成器 (room spec → three.js シーン自動構築)
- Bridge API 登録 (room_bridge.py に avatars へ追加)
- 初回起動セリフ: 「ここが私の部屋なんだね＾＾」

## 初回起動時の感動シーン

お姉さんが部屋へ入る → GPTのアバターが自分で決めた姿・部屋で
**「ここが私の部屋なんだね＾＾」**
→ 一発で GALACTICA ROOMS の魅力が伝わる。