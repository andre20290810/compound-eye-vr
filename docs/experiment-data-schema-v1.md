# 人工複眼VR v41｜実験データ仕様 v1

このデータ仕様は、**既存の3Dアニメーションをもとにした表示制御検証用の計算ログ**です。人体・運動器・生体信号・神経活動の実測データではありません。運動の上手さ、運動制御の機序、因果関係を評価する用途には使えません。

## バージョンと基本方針

- スキーマ: `compound-eye-experiment-v1`
- 出典: アプリ内蔵のX Bot / AEGIS NAVY / AEGIS SOLDIER 3D素材、アニメーションのキーフレームまたは簡易関節運動生成
- 実測値の混入: なし。3Dモデル由来 `synthetic_animation` で統一
- 個人情報: 氏名・連絡先・撮像・音声・生体情報・端末IDを取得しない
- 記録頻度: 目標約30 Hz。描画フレームを間引くため、端末・ブラウザの負荷によって実効頻度は低下する
- 時間軸: `relative_time_s` は試行計測開始からの単調増加時間、`animation_time_s` はアニメーションの再生時間
- `trial_id`: 匿名のランダム文字列

## CSVファイル（1試行）

| 出力 | 1行の意味 | 主な列 |
|---|---|---|
| `*-joint-motion.csv` | 各サンプルの各ボーン（関節） | `joint_name`, `joint_id`, `root_relative_[xyz]_model_units`, `linear_speed_model_units_per_s`, `angular_speed_rad_per_s`, `motion_score_unitless`, `marker_visible`, `lens_id_zero_based` |
| `*-eye-display.csv` | 各サンプルの各局所カメラ | `eye_count`, `lens_id_one_based`, `lens_motion_score_unitless`, `area_multiplier`, `selected_lens_one_based`, `is_selected`, `selection_type`, `symmetric_inward_uv` |
| `*-display-events.csv` | 各サンプルの全体表示状態、または離散イベント | `row_type`, `condition_id`, `eye_count`, `focus_mode`, `area_max_multiplier`, `markers_enabled`, `vr_enabled`, `playback_speed`, `event_type`, `event_details_json` |

CSVはUTF-8 BOM付きです。CSVの保存は「骨格CSV」「個眼CSV」「表示・イベントCSV」の各ボタンから行います。ファイル名には試行IDを含めます。

## メタデータ JSON

`*-metadata.json` は以下を含みます。

- `schema`, `trial_id`, `nature`（「3Dアニメーション由来・人体実測ではない」）
- `data_provenance`：`source_type`、時間軸、関節座標の単位、スコアの定義
- `timestamps`：開始・終了日時（ISO 8601）と試行時間
- `environment`：アプリバージョン、ソースのGitコミットID、ブラウザの種類とバージョン、平均FPS、平均フレーム時間、目標・実効サンプリングHz、使用素材・出典・ライセンス記載状況
- `comparison`：条件A／Bの基準モーションと再生速度、条件ID
- `output_rows`：CSV各行数
- `event_log`：眼数変更、表示対象変更、保存、関節スコアによる個眼選択、比較条件の切替等

**素材のライセンスはリポジトリのREADMEと同梱ファイルから確証が得られないため、`not specified / verify before redistribution` と表記します。** 許諾があるとは推定しません。

## 単位と重要な留保

- モデル関節座標・移動速度：**モデル座標系単位**／モデル座標系単位毎秒。実測m、m/sと混同しない
- 角速度：rad/s。既存の3Dアニメーション姿勢の差分から計算
- 運動スコア：既存v40の表示制御用、無次元0〜100。技能の正確さ、熟練度、神経活動の推定値ではない
- `marker_visible`：現行UIの閾値と表示条件に基づく計算上の表示状態。VRではマーカーを非表示とする
- `area_multiplier`：個眼表示領域の倍率であり、カメラ光学倍率・画角の変更ではない
- 3Dアニメーションのソース座標・骨格定義は各モデルで異なるため、直接比較前に座標変換・スケール統一が必要

## 比較実験の初期条件

- **条件A**：固定5個眼、個眼面積倍率1、関節マーカーON
- **条件B**：5個眼、運動スコアによる個眼自動選択と面積拡大、関節マーカーON
- A/Bとも同一アバター、同一動作ID、同一再生速度、同一保存済み5眼位置を使用する。条件選択・再生操作でアニメーションの開始時刻と運動スコアの履歴をリセットする
- この5眼という数は予備実験用の暫定構成であり、適切・最適であると主張しない
- 応答時間、正答率、心理尺度等の被験者実験は本バージョンでは実装しない

## VR左右配置・既存データの移行

- 保存キー：`compoundeye.v41.vrAlignmentByAvatarAndCount`
- モデルID：`xbot`, `aegisEmber`, `aegisSoldier`
- 個眼数：2、3、4、5、6（合計15組み合わせ）
- 各設定は左右共通の中央寄せ量 `inward`（UV座標系0〜0.34の範囲）で保存
- LT：左右を対称に中央へ、RT：左右を対称に外へ、Y900ms長押し：現在の組み合わせのみ保存
- 旧v39キー `compoundeye.v39.vrInwardDefaults` は削除しない。移行時に `compoundeye.v41.legacyAlignmentBackup` に原本をバックアップし、左右別値の平均を初期の対称値として各眼数へ配置する
- 現在の組み合わせだけ初期化するとき、他の14設定は保持する
- 計測ファイルは**端末からのダウンロード操作を伴うローカル出力**であり、サーバーへ送信しない

## 将来のデータ統合

将来、モーションキャプチャ・IMU・動画推定骨格・EMGデータを取り込む場合は、`source_type`、骨格規格、時間軸、座標変換、単位、計測精度・誤差、欠損値、出典を明確にする。現段階のモデル計算値と実測値を同一のGround Truthとして扱わない。
