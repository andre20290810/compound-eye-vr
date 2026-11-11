# v54 実装・検証記録

## 使い方
通常表示は変更せず、設定内の「部位間の時間関係・増減」を開いて解析する。統合CSVボタンは現在の1動作・全関節を出力する。骨格・解析条件JSONを同時に保存すれば、親階層と全ノードの時刻別TRSを使って姿勢を再構成できる。

「通常」「速い部位」「増速・減速と関係」「X・Y差分」を切り替える。X/Yには部位と移動速度／角速度を指定し、局面の開始・終了、開始閾値、持続サンプル数、変化率閾値、ピーク条件を設定する。イベントの前後移動は原アニメーション時刻に同期する。2〜6個眼とHMDの単眼／双眼は別設定のまま維持した。

## AEGIS修正
NAVYとSOLDIERの共通13関節スキンに対して、パンチAは視覚上のグローブ中心を対象に2関節IKを解き、体幹が回っても正中線方向へ進むよう修正した。骨長は変えない。パンチBは別動作として維持する。歩行・走行はX Botの周期と脚の元トラックを基準に、バインド軸を変換し、膝を屈曲軸へ制限した。腕はAEGIS固有の中立姿勢から有限幅で振る。ループ末尾補間と短い周期フィルタを加え、ブーツを同側の下腿へ剛体重み付けし、パンツの分散重みを狭めた。

比較画像は正面・斜め・側面の視点を実際に固定し、パンチは元時刻0/.45/.65/1.25秒で撮影した。再生倍率は1。過去の撮影で倍率やドラッグ目標が残ると視点・局面表示が誤るため、撮影スクリプトは両方を固定している。拳の許容差は前腕長に対する工学的な可視化基準であり、空手・人体の正解基準ではない。

## 解析の意味と制限
Aは開始候補、局所ピーク／平坦ピーク区間、ピークの時間差、X減速とY増速の重なりを示す。因果や正しい運動順序は推定しない。Bは互換な単位の最大値同士の比と同時刻の比を分離する。分母0・微小値・欠損は未定義。移動速度と角速度の比は出さない。骨盤の並進が0でも回転は別に解析する。

Cは局面内の速度波形と位置の3階ベクトル微分によるジャークRMSを参考表示する。平滑化・サンプリング・端点の影響がある。技能スコアではない。SPARCは参照実装の検証がないため無効にした。旧 motion_score_0_to_100 は表示用の運動量指標であり技能評価として使用しない。

Dは同一骨格・厳密な同一関節ID・互換単位の2動作で、元時刻のピーク／開始／範囲の差と正規化時間の差を別々に表示する。異骨格の対応が未検証なら比較を停止する。SpineとSpine1を同じcanonical名だけで同一視しない。

旧CSVは記録された速度・位置を再平滑化せず読み込む。元姿勢・クォータニオン等が存在しない列は推測しない。重複時刻、非単調時刻、列数不一致、部位間で不一致な時刻列は明示的に拒否し、無断で並べ替え・補間しない。1回に1骨格・1動作・1試行を読み込む。読込CSVと現在の3D素材の対応は検証していないため、その重ね合わせとX/Y別動作比較は無効。

## 再現性
先頭29列はv53の列順と数値の意味を維持した。追加57列を合わせて86列。旧数値の小数桁整形を保持し、追加列は最大15有効桁で保存する。原データの実測Hzは不明であり、約30Hzはアニメーションを再標本化した間隔にすぎない。最終サンプルは duration−0.00001 のため、旧列の nominal dt 計算と追加の実時刻微分を metadata に分けて記録する。

原位置は root translation のみを除去したGLBモデル座標。モデル単位をmと断定しない。クォータニオンは親基準のxyzw。骨格JSONに全ノードのbindと時刻別local translation/rotation/scaleを収録する。model-to-worldは保存時のビューアー配置スナップショットであり、ゲーム空間内の歩行軌跡ではない。実行時スキン変換は素材ハッシュとは別に実装コミットで追跡する。

イベントJSONは試行・動作・改訂・素材・関節・単位・閾値・品質・時間差を保持する。画面表示ログは描画を指示した時刻と処理時間であり、HMDの発光時刻／実機遅延の測定ではない。専門家ルールの入れ物は空のままにし、観測・専門家ルール・モデル予測・説明を混同しない。

## 実施した検証
- Nodeの9テストが成功。利用者CSVの抜粋70行、符号付き変化率、66.7msのピーク差、等速直線・等速円、静止、q/−q、欠損、重複時刻、平坦ピーク、列検査、同一関節ID、再平滑化禁止を含む。
- デスクトップEdgeのブラウザ回帰テスト14項目が成功。v53とv54の全1,088行×8数値列の互換性、86列・32関節、CSV/骨格JSON連携、元時刻同期、同一X/Y差分0、異骨格拒否、旧CSV再読込、描画姿勢とCSVの一致、骨長、1〜6個眼×単眼／双眼のWebGL描画、保存レイアウト、標準Gamepad APIの模擬入力を確認した。
- 詳細は `evidence/v54/browser-regression.json`、`punch-acceptance-v54.json`、比較画像を参照。性能欄は同一テスト環境のCPU描画コマンド発行時間で、HMDの実効fpsではない。

## 未検証・残る制約
実機HMD、実機GameSir、iPhone/Safari、身体技能学習効果、衝突・接地の物理的正しさは未検証。AEGISは独立した指・足首・つま先のボーンを持たず、指を閉じる／足裏接地を独立制御することはできない。パンツの一部頂点には残留変形があり、完全な剛体装甲モデルや実測の自然歩行としては扱わない。呼吸クリップに元から含まれる局所スケールは保持する。ユーザーによる見た目・実機の受入確認は、この数値検証とは別に必要。

## 開発・再テスト
```sh
npm install
npm test
npm run build
npm run check
# 必要に応じて BROWSER_EXECUTABLE を既存Chrome/Edgeへ設定する。
# v53との比較を行う場合は V53_BASELINE_DIR をbackup-v53の作業ツリーへ設定する。
npm run test:browser
```
`tools/capture-v54-punch.cjs` / `capture-v54-gait.cjs` と対応するmontageツールで比較画像を再生成する。比較用v53は `backup-v53-before-kinematics-20261111` タグ。`index.html` はオフラインで開ける自己完結版。解析ソース3点と歴史的ファイル名の `motion-workbench-v48.js` は `tools/bundle-v54.cjs` で埋込版と照合する。

## CSV列定義

| No. | 列名 | 定義 |
|---:|---|---|
| 1 | `data_schema` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 2 | `source_type` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 3 | `avatar_id` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 4 | `motion_id` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 5 | `source_asset_id` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 6 | `skeleton_id` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 7 | `coordinate_system` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 8 | `time_axis` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 9 | `original_animation_time_s` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 10 | `resampled_interval_s` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 11 | `joint_name_source` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 12 | `joint_id` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 13 | `joint_name_ja` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 14 | `canonical_joint_id` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 15 | `position_x_root_relative` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 16 | `position_y_root_relative` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 17 | `position_z_root_relative` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 18 | `linear_speed_model_units_per_s` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 19 | `angular_speed_rad_per_s` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 20 | `linear_acceleration_model_units_per_s2` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 21 | `angular_acceleration_rad_per_s2` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 22 | `motion_score_0_to_100` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 23 | `position_unit` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 24 | `linear_speed_unit` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 25 | `angular_speed_unit` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 26 | `linear_acceleration_unit` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 27 | `angular_acceleration_unit` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 28 | `motion_score_unit` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 29 | `quality_warning` | v53互換の既存列。数値列の意味と計算法を維持。data_schema は v2 に更新。 |
| 30 | `linear_speed_change_rate_model_units_per_s2` | 符号付き d|v|/dt。保存した移動速度を実際のタイムスタンプで中心差分。増速は正、減速は負。 |
| 31 | `angular_speed_change_rate_rad_per_s2` | 符号付き d|ω|/dt。角速度ベクトルの微分ではなく、保存した角速度の大きさの変化率。 |
| 32 | `raw_position_x_root_relative` | 未平滑化の各原時刻の関節位置。ルート並進を除いたGLBモデル軸、model_units。 |
| 33 | `raw_position_y_root_relative` | 未平滑化の各原時刻の関節位置。ルート並進を除いたGLBモデル軸、model_units。 |
| 34 | `raw_position_z_root_relative` | 未平滑化の各原時刻の関節位置。ルート並進を除いたGLBモデル軸、model_units。 |
| 35 | `smoothed_position_x_root_relative` | 3点移動平均後の解析用位置。model_units。旧 position_* 列と対応。 |
| 36 | `smoothed_position_y_root_relative` | 3点移動平均後の解析用位置。model_units。旧 position_* 列と対応。 |
| 37 | `smoothed_position_z_root_relative` | 3点移動平均後の解析用位置。model_units。旧 position_* 列と対応。 |
| 38 | `quaternion_x` | 正規化した親基準の局所クォータニオン成分。x,y,z,w順。 |
| 39 | `quaternion_y` | 正規化した親基準の局所クォータニオン成分。x,y,z,w順。 |
| 40 | `quaternion_z` | 正規化した親基準の局所クォータニオン成分。x,y,z,w順。 |
| 41 | `quaternion_w` | 正規化した親基準の局所クォータニオン成分。x,y,z,w順。 |
| 42 | `quaternion_reference` | xyzw_local_parent_normalized。親ノードに対する局所回転。q と −q は同じ回転。 |
| 43 | `joint_parent_id` | 同じ骨格内の親ノードID。canonical名ではなく skeleton_id + joint_id を識別子とする。 |
| 44 | `joint_bind_translation_x` | バインド姿勢の局所並進、model_units。 |
| 45 | `joint_bind_translation_y` | バインド姿勢の局所並進、model_units。 |
| 46 | `joint_bind_translation_z` | バインド姿勢の局所並進、model_units。 |
| 47 | `joint_bind_quaternion_x` | バインド姿勢の局所クォータニオン成分、xyzw順。 |
| 48 | `joint_bind_quaternion_y` | バインド姿勢の局所クォータニオン成分、xyzw順。 |
| 49 | `joint_bind_quaternion_z` | バインド姿勢の局所クォータニオン成分、xyzw順。 |
| 50 | `joint_bind_quaternion_w` | バインド姿勢の局所クォータニオン成分、xyzw順。 |
| 51 | `joint_bind_scale_x` | バインド姿勢の局所スケール、無次元。 |
| 52 | `joint_bind_scale_y` | バインド姿勢の局所スケール、無次元。 |
| 53 | `joint_bind_scale_z` | バインド姿勢の局所スケール、無次元。 |
| 54 | `joint_local_translation_x` | 各原時刻の関節局所並進、model_units。 |
| 55 | `joint_local_translation_y` | 各原時刻の関節局所並進、model_units。 |
| 56 | `joint_local_translation_z` | 各原時刻の関節局所並進、model_units。 |
| 57 | `root_model_position_x` | 各原時刻のルートmodel座標、model_units。 |
| 58 | `root_model_position_y` | 各原時刻のルートmodel座標、model_units。 |
| 59 | `root_model_position_z` | 各原時刻のルートmodel座標、model_units。 |
| 60 | `root_local_quaternion_x` | 各原時刻のルート局所クォータニオン、xyzw順。 |
| 61 | `root_local_quaternion_y` | 各原時刻のルート局所クォータニオン、xyzw順。 |
| 62 | `root_local_quaternion_z` | 各原時刻のルート局所クォータニオン、xyzw順。 |
| 63 | `root_local_quaternion_w` | 各原時刻のルート局所クォータニオン、xyzw順。 |
| 64 | `root_model_matrix_16` | 各原時刻のルートmodel行列。16要素JSON、列優先。 |
| 65 | `model_to_world_matrix_16` | CSV出力時のビューアー配置行列のスナップショット。移動操作の時系列ではない。非表示の比較対象は空欄。 |
| 66 | `model_to_world_transform_kind` | static_viewer_actor_transform_snapshot。 |
| 67 | `dataset_id` | モデル・動作・動作改訂・素材ハッシュを組み合わせたデータ識別子。 |
| 68 | `trial_id` | 同一セッションの同一合成データをCSV・骨格JSON・イベントJSONで結ぶID。独立した人の試行数ではない。 |
| 69 | `motion_revision_id` | 手続き動作・リターゲットを含む動作改訂ID。 |
| 70 | `source_asset_version` | 元GLBと実行時変換の版ラベル。変換コードは implementation_commit で特定する。 |
| 71 | `source_asset_sha256` | 埋込元GLBバイト列のSHA-256。実行時スキン補正後の頂点ハッシュではない。 |
| 72 | `app_version` | v54。 |
| 73 | `implementation_commit` | build-manifest.json が示す実装コミット。未検証ビルドでは明示的に未検証とする。 |
| 74 | `analysis_config` | 平滑化、端点、旧列計算法、新しい符号付き微分、単位・座標・合成データの制約を含むJSON。 |
| 75 | `filter_method` | moving_average。元姿勢と処理済み姿勢を区別する。 |
| 76 | `filter_window_samples` | 3サンプル。 |
| 77 | `endpoint_handling` | truncated_window。窓の外を架空に補完しない。 |
| 78 | `differentiation_method` | 符号付き列は実タイムスタンプの中心割線差分、両端は片側差分。旧列は analysis_config の legacy_* 定義を維持。 |
| 79 | `root_relative_definition` | ルート並進だけを除去。ルート回転は除去しない。 |
| 80 | `angular_acceleration_definition` | 旧角加速度列は角速度スカラーの微分の絶対値。角加速度ベクトルではない。 |
| 81 | `position_raw_origin` | 未平滑化のGLTF補間／手続き姿勢。人のセンサ生データではない。 |
| 82 | `data_quality_status` | synthetic_interpolated または partial。 |
| 83 | `unavailable_reason` | 未取得姿勢、重複・不正時刻、微分不能などの理由。空欄はこの検査で問題なし。 |
| 84 | `joint_local_scale_x` | 各原時刻の関節局所スケール、無次元。 |
| 85 | `joint_local_scale_y` | 各原時刻の関節局所スケール、無次元。 |
| 86 | `joint_local_scale_z` | 各原時刻の関節局所スケール、無次元。 |
