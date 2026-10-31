# 3D 数字分身：建模 → 上网页

技术栈和 matthewpetersen.ca 一样（2026-10-30 从他的 JS bundle 里读出来的）：

| | Petersen | 这里 |
| :-- | :-- | :-- |
| 模型 | Ready Player Me 导出的 GLB（`rigged_avatar_rpm4.glb`） | **Avaturn** 导出的 GLB（Ready Player Me 已于 2026-01-31 关闭） |
| 驱动 | TalkingHead（他 fork 的 met4citizen/TalkingHead），three.js | `@met4citizen/talkinghead` 1.8.2，three 0.186 |
| ASCII | `postprocessing` 的自定义 Effect（16×16 字符图集，从上往下的 reveal，鼠标划过时字符打乱并留下拖尾） | 同一个 shader，改成按主题配色、字符之间透明（`src/twin3d/AsciiEffect.js`） |
| 声音 | Cartesia TTS，带单词时间戳和口型（viseme）时间戳，每个浏览器每天 180 秒 | 同样（`twin-api/src/tts.js`）；没有 key 或额度用完时，按原来的打字节奏无声对口型 |
| 节奏 | 每句话都读出来，文字跟着读到的单词出现 | 同样 |

## 1. 建模（你来做，约 15 分钟）

1. 打开 https://avaturn.me ，注册，选 **Create from photos**。
2. 用手机拍 3 张自拍：正脸、左侧脸、右侧脸。光线均匀，不戴眼镜，头发别挡脸。
3. 生成后调整发型、肤色和衣服，尽量贴近你本人（`public/twin/portrait.png` 可以拿来对照）。
4. **Export → GLB**。要选带 ARKit 面部表情和口型（visemes）的那种 body（新版本默认都带）。
5. 把文件存到 `avatar/source/astrid.glb`（这个目录已加入 gitignore，原始文件不会进 git）。

## 2. 检查和压缩

```
cd avatar
npm install
node prepare-avatar.mjs --check source/astrid.glb   # 只检查
node prepare-avatar.mjs source/astrid.glb           # 写出 ../public/twin/avatar.glb
```

检查 TalkingHead 需要的三样东西：54 根骨骼（Mixamo 命名，含 LeftEye / RightEye）、52 个 ARKit 表情、15 个 Oculus 口型。
口型缺失时，按 TalkingHead 自带的 `build-visemes-from-arkit.py` 用 ARKit 表情合成。然后把贴图压到 1024px WebP，
再做 meshopt 压缩。TalkingHead 自带的 Avaturn 示例模型从 13.8 MB 压到了 2.6 MB。

## 3. 上网页

在仓库根目录新建 `.env`（会提交进 git，开发和生产都会读）：

```
REACT_APP_TWIN_AVATAR=twin/avatar.glb
```

不设这个变量，首页就继续用原来的视频分身。模型加载失败或者浏览器不支持 WebGL 时，也会自动退回视频分身。
镜头、字符大小在 `src/components/sceneConfig.js` 里调（`avatarView`: head / upper / mid / full，`avatarCell`）。

本地想先看效果：把任意测试 GLB 放到 `public/twin/dev/avatar.glb`（已 gitignore），然后在 `.env.development.local` 里写
`REACT_APP_TWIN_AVATAR=twin/dev/avatar.glb`。

## 4. 声音（可选，和 Petersen 一样用 Cartesia）

1. 在 https://play.cartesia.ai 注册，用一段 10 秒以上的录音克隆你自己的声音（Instant Voice Clone），记下 voice id。
2. `twin-api/wrangler.toml` 里填 `CARTESIA_VOICE_ID`，然后：
   ```
   cd twin-api
   npx wrangler secret put CARTESIA_API_KEY
   npm run deploy
   ```
3. 完成。每个气泡都会读出来，嘴型跟着音素走。每个浏览器每天最多 180 秒，超出后改成无声对口型；
   每个 IP 每分钟最多 60 句（`TTS_LIMITER`）。

## 已知限制

- 构建时会有一条 `Critical dependency: the request of a dependency is an expression` 警告，来自 TalkingHead
  按运行时拼出来的路径加载口型模块。我们改成直接给它英文模块，所以运行时不受影响。只有在 `CI=true` 的环境里
  构建（比如 Vercel、Netlify）这条警告才会让构建失败。
- 中文回答：有 Cartesia 声音时，口型按音素对得上；无声模式下，TalkingHead 只会读英文单词的口型，中文时嘴不动。
