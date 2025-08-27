# OSPAN Task

## 概要

Operation Span Task (OSPAN) は、ワーキングメモリを測定するための課題です。この実装は、Unsworth et al. (2005) の自動化版OSPANに基づき、Révész et al. (2017) の推奨事項を取り入れた日本語版です。

## 主な機能

### 1. 時間制限機能
- 練習試行での平均回答時間を基に、本番での制限時間を自動計算（平均 + 2.5SD）
- 制限時間を超えると自動的に次の問題へ進行
- タイムアウトの記録と表示

### 2. 85%正答率閾値
- 計算問題の正答率が85%未満の場合、警告を表示
- データの信頼性を確保するための除外フラグを記録

### 3. データ記録
- OSPANスコア、正答率、回答時間など全てのデータをCSV形式で出力
- 研究分析に必要な詳細情報を含む

## セットアップ

### 必要なファイル
1. `index.html` - メインHTMLファイル
2. `script.js` - JavaScriptファイル

### 使用方法
1. 両ファイルを同じディレクトリに配置
2. `index.html` をウェブブラウザで開く
3. 参加者IDを入力して開始

### 推奨環境
- ブラウザ（Chrome, Firefox, Safari, Edge）
- 画面解像度: 1280×720以上
- JavaScript有効

## 課題の流れ

### 1. 練習フェーズ
- **文字記憶練習**: 3-4文字の系列を記憶・再生（2試行）
- **計算問題練習**: 簡単な計算問題を解く（2-3問×2試行）
- **組み合わせ練習**: 計算と文字記憶を交互に実施（2-3セット×2試行）

### 2. 本番フェーズ
- 3-7文字の系列をランダムな順序で実施（各3試行、計15試行）
- 各試行で計算問題と文字記憶を交互に実施
- 時間制限付き（練習時の平均 + 2.5SD）

## データ出力

### CSV形式
出力ファイル名: `ospan_results_[参加者ID]_[日時].csv`

### 主要カラム
| カラム名 | 説明 |
|---------|------|
| `participant` | 参加者ID |
| `datetime` | 実施日時 |
| `session` | セッションタイプ（practice_letter/practice_math/practice_both/main） |
| `trial` | 試行番号 |
| `setSize` | 記憶項目数（3-7） |
| `letters_sequence` | 提示された文字列（番号形式） |
| `math_correct_array` | 各計算問題の正誤（1=正解, 0=不正解） |
| `math_rt_array` | 各計算問題の回答時間（ミリ秒） |
| `math_timeout_array` | タイムアウトフラグ（1=時間切れ, 0=通常） |
| `recall_array` | 再生された文字列（番号形式、?=不明） |
| `recall_correct` | 正しく再生された文字数 |
| `recall_rt` | 再生にかかった総時間（ミリ秒） |
| `ospan_score` | OSPANスコア（完全正答試行のセットサイズ合計） |
| `math_accuracy_percent` | 計算問題の正答率（%） |
| `letter_accuracy_percent` | 文字記憶の正答率（%） |
| `math_time_limit_ms` | 設定された時間制限（ミリ秒） |
| `excluded_due_to_accuracy` | 85%基準未達成フラグ（YES/NO） |

### サマリー統計
CSVファイルの下部に以下の要約統計が含まれます：
- 総OSPANスコア
- 計算問題正答率
- 文字記憶正答率
- 時間制限値
- タイムアウト総数
- 完全正答試行数

## 技術仕様

### 文字セット
使用文字: F, H, J, K, L, N, P, Q, R, S, T, Y（12文字）

### 計算問題
- 形式: `(a × b) + c = ?` または `(a ÷ b) - c = ?`
- 答えの範囲: 1-9の整数
- 正答/誤答を50%の確率でランダムに提示

### タイミング
- 文字提示時間: 850ms
- 文字間間隔: 240ms
- 計算問題制限時間: 練習時の平均 + 2.5SD

## スコアリング

### OSPANスコア
完全正答試行（全ての文字を正しい順序で再生し、かつ全ての計算問題に正解）のセットサイズの合計

### 除外基準
- 計算問題正答率が85%未満の参加者データは分析から除外することを推奨

## 参考文献

- Unsworth, N., Heitz, R. P., Schrock, J. C., & Engle, R. W. (2005). An automated version of the operation span task. *Behavior Research Methods*, 37(3), 498-505.

- Révész, A., Michel, M., & Lu, X. (2017). Investigating IELTS Academic Writing Task 2: Relationships between cognitive writing processes, text quality, and working memory. *IELTS Research Reports Online Series*, 2017/3.

- Conway, A. R., Kane, M. J., Bunting, M. F., Hambrick, D. Z., Wilhelm, O., & Engle, R. W. (2005). Working memory span tasks: A methodological review and user's guide. *Psychonomic Bulletin & Review*, 12(5), 769-786.

## 注意事項

- 実験実施前に必ず練習セッションを含めて説明を行ってください
- 静かな環境で実施することを推奨します
- 疲労の影響を避けるため、適切な休憩を設けることを検討してください

## ライセンス

このソフトウェアは研究・教育目的での使用を想定しています。商用利用の際はご相談ください。

## トラブルシューティング

### Q: 時間制限が機能しない
A: JavaScriptが有効になっているか確認してください。また、最新のブラウザを使用してください。

### Q: CSVファイルがダウンロードされない
A: ブラウザのポップアップブロッカーを無効にしてください。

### Q: 文字が正しく表示されない
A: UTF-8エンコーディングに対応したブラウザを使用してください。

## お問い合わせ

質問などはメール(komuro.4121(at)gmail.com)でご連絡ください。
