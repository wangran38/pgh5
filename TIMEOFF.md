# 交接文档（TIMEOFF）

> 面向"完全没有上文的新会话"。请先读本文件，再动手改代码。
> 项目路径：`c:\Users\97073\Desktop\pgh5`（uni-app + Vue3 `<script setup>`，主力形态 **H5**，同时考虑 App / 小程序）

---

## 一、项目是什么

「陈皮票根」本地生活优惠平台：

- **C 端**：用户上传/识别票根 → 浏览商家 → 到店"优惠买单"（选券、选票根、支付）→ 我的订单/票根/优惠券。
- **B 端（商家端）**：入驻申请 → 店铺资料 → 优惠券管理 → 券码核销 →（规划中）看板/结算/营销。

后端 API 基址在 [utils/request.js](file:///c:/Users/97073/Desktop/pgh5/utils/request.js)：
`export const baseURL = 'https://wx.chenpecloud.com/api'`

---

## 二、本次会话做了什么（按时间顺序）

### 1. C 端「优惠买单」页 `pages/shop/coupons/coupons.vue`
- 移除原店铺信息条，改为「消费总额」输入卡（大号居中输入框）。
- 优惠券卡：按券门槛 `min_point` 判断，满足则彩色点亮、不满足整卡置灰。
- 券卡右侧加**单选勾选圈**：仅满减券(1)/折扣券(2) 可选；门票类(3/4) 在"消费总额买单"场景始终置灰不可选。
- 金额联动：满减券优惠 = `discount_amount`；折扣券优惠 = 总额 ×(1−折率)，折率规则见下方"避坑"。
- 底部支付栏：实付金额 + 已优惠 + 立即支付（`#ff5c7c → #ff2d55` 粉红胶囊）。
- 新增「使用票根」选择行 + 底部弹层（复用 `getUserTicketList`，过滤已兑换票根）。
- 下单：`POST /user/order/create`。**不选券、不选票根也能买**（未使用时不携带 `coupon_id`/`ticket_id` 字段）。
- 支付：下单成功 → 渠道选择 ActionSheet（微信/支付宝）→ 调 `pay()`，失败/取消分别提示；用户取消渠道则提示"订单已创建，可在我的订单继续支付"。

### 2. 支付封装 `utils/payment.js`（新增）
- 对外只暴露 `pay({ orderId, orderNo, channel })` 和 `PAY_CHANNELS`（`wechat` / `alipay`）。
- 返回值：`'paid'`（明确成功）/ `'pending'`（已跳转待回调）；取消统一抛 `Error('cancel')`；参数获取失败抛带 `silent=true` 的错（避免与 request.js 重复提示）。
- 按端条件编译分发：H5 微信内 `WeixinJSBridge` JSAPI / H5 普通浏览器跳 `mweb_url` / 小程序 `uni.requestPayment(wxpay)` / App `uni.requestPayment`；支付宝 H5 提交 `form` 或跳 `pay_url`、小程序 `my.tradePay`、App `orderInfo`。
- 新增渠道只需改 `PAY_CHANNELS` + `invokeByChannel`。

### 3. 商家详情 `pages/shop/detail/detail.vue`
- 「专享优惠」区 `max-height: 252rpx`，内容过多在框内滚动。
- `cover_images`（逗号分隔多图）改为 `swiper` 多图轮播 + 白色指示点，点击 `uni.previewImage` 预览；无图回退 `shopLogo`，再兜底渐变占位。
- **补上一个从未实现的函数 `openMap`**：H5 用 `window.open('https://uri.amap.com/marker?position=lng,lat&...')`，其它端 `uni.openLocation`；无经纬度时 toast 提示。

### 4. 首页 `pages/index/index.vue`
- 「票根立减」文案 `.benefit-val` 改为最多 3 行省略（`-webkit-line-clamp: 3` + `max-width:100%`，不要用单行 `nowrap`，否则红底标签条会变形）。
- 进入页面/刷新也触发 GPS 定位：新增 `ensureLocateCity(showTip)`，onMounted 调用时 `showTip=false`（**静默不弹"已定位"toast**）；登录成功也调它，用 `gpsLocated` 做会话级去重。
- **修复 `/shops` 请求两次**：删除了 `locateCityByGps` 内定位成功后的 `loadShops()`（列表只依赖 `category_id + user_lng/lat`，与定位到的城市名无关）。
- 票根识别失败弹窗新增「人工审核」按钮：`showModal` 显示客服电话 → 确认后 `uni.makePhoneCall`。**电话号码目前是占位 `400-800-1234`**（`contactSupport()` 内）。

### 5. 定位纠偏 `utils/location.js`
- 问题：H5 的 `uni.getLocation` 返回 **WGS84**，而高德/商家坐标是 **GCJ02**，偏差数百米。
- 修复：H5 优先用高德 `AMap.Geolocation`（返回即 GCJ02）；失败回退 `uni.getLocation({ type: 'wgs84' })` + 内置 **WGS84→GCJ02 纠偏算法**（`wgs84ToGcj02`）。
- 高德 JS 动态加载已带 `plugin=AMap.Geocoder,AMap.Geolocation`；key/securityJsCode 与 `manifest.json` 中一致（两处都必须同值）。

### 6. 401 登录失效统一处理 `utils/request.js` + `pages/index/index.vue`
- `body.code === 401`（或 HTTP 401）→ `handleUnauthorized()`：清 `pgtoken` → 写 `NEED_LOGIN` 标记 → toast 后端 message → 延迟 600ms `reLaunch('/pages/index/index')`；用 `redirectingLogin` 防并发重复跳转。
- 首页 onMounted 检测到 `NEED_LOGIN` 就清除标记并直接打开登录弹窗（项目**没有独立登录页**，登录是首页手机号弹窗）。

### 7. 「我的订单」页 `pages/users/order/order.vue`（新增）
- 搜索栏（订单号）+ 状态 tabs（全部/待支付/已支付/已取消）+ `auto-scroll` 分页列表；卡片显示订单号、状态徽标、应付/划线原价、已优惠、下单时间。
- 接口 `POST /user/order/list`（[api/order.js](file:///c:/Users/97073/Desktop/pgh5/api/order.js) 的 `getOrderList`），返回 `{ list, total }`。
- 已在 [pages.json](file:///c:/Users/97073/Desktop/pgh5/pages.json) 注册；入口在会员中心菜单。

### 8. 会员中心商家入口卡 `pages/users/center/center.vue`
- 用户卡下方新增独立渐变入口卡（`linear-gradient(135deg,#1e3a8a,#1d4ed8)` + 右上「商家版」切角徽标 + 右箭头），菜单里旧的「商家中心」一行已删除。
- 按 `getShopApplyStatus` 状态分态（`shopEntryDesc`）：未入驻"0 元开店，立即入驻" / 审核中"资料审核中" / 1-2"店铺名 · 进入商家工作台" / 3"已冻结" / -1·4"申请未通过"。

### 9. 商家端 Batch 1「核销中心」`pages/shop/verify/verify.vue`（新增，未提交）
- 顶部核销操作卡（券码输入 + 扫码 + 确认核销 + 结果卡），下方核销记录分页列表。
- **扫码三级降级**：
  1. H5 且 https/localhost → `getUserMedia` 实时扫码（全屏遮罩 + 抽帧解码，动态插入**原生 video**）；
  2. H5 且 http（无 `mediaDevices`）→ 自动改走 `uni.chooseImage({sourceType:['camera']})` **拍照识别**（与上传票根同能力，不受 HTTPS 限制）；
  3. App/小程序 → `uni.scanCode`。
- 解码优先 `BarcodeDetector`，兜底动态加载 **jsQR**（jsdelivr → unpkg 双源）。
- 接口（约定占位，[api/shop.js](file:///c:/Users/97073/Desktop/pgh5/api/shop.js)）：`POST /user/shop/coupon/verify`、`POST /user/shop/coupon/verify-list`。
- 商家中心「核销优惠券」菜单已由"功能开发中"改为真实跳转并带 `shop_id`。

### 10. 设计规范文档 `docs/design-guide.md`（新增）
- 提炼色板（Tailwind slate + 品牌蓝 `#1e3a8a`/`#2563eb`）、字号层级、圆角/阴影档位、列表页骨架、按钮/chip/空态、票据券卡、导航栏约定。**新页面先读它。**

---

## 三、当前状态 / 未完成

- **Git**：已提交 `8efcf12`（30 files，首次大提交），分支 `main` 跟踪 `origin/main`，**尚未 push**。核销中心相关改动（verify 页、api/shop.js 等）在提交之后，**未提交**。
- **后端接口待对齐（目前是约定占位，需后端实现）**：
  - `POST /user/order/pay` `{ order_id, order_no, channel }`
  - `POST /user/shop/coupon/verify` `{ shop_id, code }`
  - `POST /user/shop/coupon/verify-list` `{ shop_id, page, limit }`
- **待办建议**：
  - Batch 2：经营看板 + B 端订单列表/状态流转；
  - Batch 3：资金余额/提现/对账单、营销（满减/秒杀/拼团）、评价管理；
  - 核销增强：记录搜索、误核销撤销；
  - 首页"仅商家可见的轻入口"（当时讨论后未做）；
  - jsQR 改本地 `static/js/jsQR.js` 引用（部署环境无外网时必需）。

---

## 四、避坑要点（血泪，别重复踩）

### 环境与构建
1. **本项目是 HBuilderX 直接构建，没有 `package.json` / `node_modules`**，不能 `npm install`。第三方库要么 CDN 动态加载，要么放 `static/` 本地引用。
2. **H5 相机权限**：`getUserMedia` 只在 `https://` 或 `localhost` 可用；`http://192.168.x.x` 下 `navigator.mediaDevices` 为 `undefined`。`uni.chooseImage` 走系统相机拍照**不受此限制**。
3. uni-app H5 下模板里的 `<video>` 会被编译成 `uni-video`，**拿不到真实 video 元素**；需要相机流时用 `document.createElement('video')` 动态插入到某个 view 的 `$el` 中。
4. 修改 `manifest.json` 后**必须重启 HBuilderX**，热更新不生效。

### H5 行为
5. H5 下 `uni.showToast` 与 `uni.hideLoading` **共用同一实例**：先 `hideLoading()` 再 `showToast()` 会被吞，需 `setTimeout(..., 50)`。
6. H5 多页面共存于同一 DOM：**不要用 `document.querySelector` 找当前页元素**（会选到其它页面），要用组件 `ref`（如 detail 页的 `descTextRef`）。
7. 列表页统一 `.page { position: fixed; top: var(--window-top, 44px); }` + 内部 `auto-scroll`；不要用 `100vh`（动态地址栏会导致页面级滚动抢走下拉手势）。

### 业务规则
8. 优惠券类型：**1 满减 / 2 折扣 / 3 首道门票折扣 / 4 专属票价**；"消费总额买单"只用 1、2。
9. 折扣率解析（`discount_amount`）：`>= 1` 视为"X 折"（除以 10 得折率），`< 1` 视为折率本身。优惠 = 总额 ×(1−折率)。
10. 满减券创建时门槛 `min_point` 后端要求 **≥ 200**；`coupon_type` 必须传数字。
11. 券卡中缝缺口的填充色必须等于页面背景色（券类页 `#f1f5f9`），否则缺口看起来是空洞。
12. 定位后**不要再重拉商家列表**（`/shops` 只依赖分类 + 用户经纬度），否则会出现同一接口请求两次。

### 请求层约定
13. [utils/request.js](file:///c:/Users/97073/Desktop/pgh5/utils/request.js)：`code === 200` → `resolve(body)`；其它 → 自动 toast 并 `resolve(null)`（**从不 reject**）。探测类接口用 `options.silent: true` 不弹提示，页面自行处理。
14. 需要登录的接口都要带 `pgtoken` header；`api/*.js` 里已有统一写法，照抄即可。

### 设计与协作
15. 新页面**先看 `docs/design-guide.md`**，颜色只用 slate 色板 + 品牌蓝，别自造杂灰（曾因此被判"风格不统一"返工）。
16. 终端（PowerShell）显示中文 commit message 会乱码，但仓库里实际是 UTF-8，**不要因此去改编码**。
17. 本机 git 未配置 `user.name/user.email`，提交需临时指定：
    `git -c user.name="wangran38" -c user.email="wangran38@users.noreply.github.com" commit -m "..."`
18. `manifest.json` 内含有高德 key/securityJsCode，随代码提交到 GitHub（仓库 `https://github.com/wangran38/pgh5.git`），注意泄露风险。
19. `.vscode/` 未跟踪且未加入 `.gitignore`，提交时勿误加。

---

## 五、常用命令

```powershell
# 查看当前改动
git status --short

# 提交（身份需临时指定）
git -c user.name="wangran38" -c user.email="wangran38@users.noreply.github.com" commit -m "..."

# 推送到远端（当前有 1 个未推送提交，另有核销相关改动未提交）
git push origin main
```

---

## 六、快速上手建议（给新会话）

1. 先读本文件 + `docs/design-guide.md`；
2. 涉及列表页就参考 `pages/shop/verify/verify.vue`（含 `auto-scroll` + `usePageList` + 分页/空态/样式范例）；
3. 涉及接口就参考 `api/order.js`、`api/shop.js` 的 `pgtoken` 写法；
4. 后端核销/看板/支付接口目前是**约定占位**，若后端给了真实字段，只需调整对应 `api/*.js` 与页面里的字段兼容逻辑（页面已做多命名兼容）。
