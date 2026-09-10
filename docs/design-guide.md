# 陈皮票根（pgh5）页面设计风格规范

> 本文档从现有页面（index、users/center、shop/promo、shop/couponlist、shop/detail 等）中提炼，
> 供新页面设计与旧页面风格对齐时参考。所有数值均为项目实际使用值。

## 1. 设计基调

- **色板体系**：全项目采用 Tailwind **slate 灰蓝色板**（`#0f172a / #1e293b / #475569 / #64748b / #94a3b8 / #cbd5e1 / #e2e8f0 / #f1f5f9 / #f8fafc`），不使用杂灰色。
- **品牌主色**：深蓝 `#1e3a8a`（导航栏、渐变头部），交互蓝 `#2563eb`（主按钮、选中态）。
- **视觉特征**：浅灰底 + 白色圆角卡片 + 轻阴影，信息密度高、留白克制。

## 2. 颜色系统

### 2.1 品牌色与功能色

| 用途 | 色值 | 出处 |
|---|---|---|
| 品牌深蓝（导航栏/渐变起点） | `#1e3a8a` | pages.json、center.vue |
| 品牌蓝渐变 | `linear-gradient(135deg, #1e3a8a, #1d4ed8)` | center.vue 用户卡 |
| 主按钮 / 选中态蓝 | `#2563eb` | promo.vue 提交按钮、tag-chip active |
| 危险 / 价格 / 必填红 | `#dc2626` | promo.vue required、center.vue 退出按钮 |
| 危险浅红底 | `#fef2f2`（描边 `#fee2e2`） | center.vue 退出按钮 |
| 时效提醒橙点 | `#f59e0b` | 券卡 `.dot` |

### 2.2 文字色层级（slate）

| 层级 | 色值 | 字重 | 典型字号 |
|---|---|---|---|
| 页面大标题 | `#0f172a` | 900 | 36rpx |
| 卡片标题 / 券标题 | `#0f172a` | 800 | 30–34rpx |
| 正文 / 菜单文字 | `#1e293b` | 600–700 | 26–28rpx |
| 次要文字 / 表单 label | `#475569` | 600 | 24–26rpx |
| 辅助说明 / 副标题 | `#64748b` | 400 | 22–24rpx |
| 占位 / 禁用 / 空态 | `#94a3b8` | 400 | 20–26rpx |
| 箭头 / 分隔符 | `#cbd5e1` | — | — |

### 2.3 背景与描边

| 用途 | 色值 |
|---|---|
| 普通页面背景 | `#f8fafc`（index、center、promo） |
| 券类列表页背景 | `#f1f5f9`（couponlist、coupons，票据缺口颜色需同步） |
| 卡片背景 | `#fff` |
| 卡片内嵌浅灰区（输入框区、chip 底） | `#f8fafc` 或 `#f1f5f9` |
| 列表项分隔线 | `1rpx solid #f1f5f9` |
| 券卡虚线分隔 | `1rpx dashed #e2e8f0` |
| 输入下边框 | `1rpx solid #e2e8f0` |

## 3. 圆角与阴影

| 场景 | 圆角 | 阴影 |
|---|---|---|
| 常规白卡（菜单卡/表单卡/信息卡） | `24rpx` | `0 2rpx 8rpx rgba(0,0,0,0.03)` |
| 票据式券卡 | `22rpx` | `0 6rpx 18rpx rgba(15,23,42,0.06)` |
| 渐变主视觉卡（用户卡） | `24rpx` | `0 8rpx 20rpx rgba(30,58,138,0.2)` |
| 内嵌浅灰区 | `16rpx` | 无 |
| 小标签 chip | `6rpx` | 无 |
| 主按钮 | `18rpx` | 无 |
| 可选胶囊 tag | `40rpx` | 无 |

## 4. 间距

- 页面左右内边距：`24rpx`（券类页）/ `28–30rpx`（普通页）。
- 卡片内边距：`24–28rpx`；卡片之间外边距：`22–30rpx`。
- 列表项上下内边距：`28–32rpx`。

## 5. 核心组件模式

### 5.1 列表页骨架（统一写法）

```scss
.page {
  position: fixed;              // 防 H5 动态地址栏导致页面级滚动抢手势
  top: var(--window-top, 44px); // 避开系统导航栏
  right: 0; bottom: 0; left: 0;
  display: flex; flex-direction: column; overflow: hidden;
  background-color: #f1f5f9;    // 券类页；普通页用 #f8fafc
  padding: 24rpx; box-sizing: border-box;
}
```

滚动区统一使用 `<auto-scroll ref="scrollRef" refresher-enabled ...>`，
数据变化后 `nextTick` 调用 `scrollRef.sync()` 重新测量。

### 5.2 按钮

```scss
// 主按钮
background: #2563eb; color: #fff;
height: 92rpx; line-height: 92rpx; border-radius: 18rpx;
font-size: 30rpx; font-weight: 800; border: none; &::after { border: none; }

// 危险按钮
background: #fef2f2; color: #dc2626; border: 1rpx solid #fee2e2;
height: 84rpx; border-radius: 16rpx; font-weight: 800; font-size: 28rpx;
```

### 5.3 小标签 chip（券卡内、业态标签）

```scss
font-size: 20rpx; color: #475569; background: #f1f5f9;
border-radius: 6rpx; padding: 4rpx 12rpx;
```

可选筛选胶囊：`border-radius: 40rpx; border: 1rpx solid #e2e8f0; background: #f8fafc;`，
选中态 `background/border-color: #2563eb; color: #fff; font-weight: 700;`。

### 5.4 空态 / 加载态 / 触底提示

```scss
.state-text { text-align: center; color: #94a3b8; font-size: 26rpx; padding: 120rpx 0; }
.load-more  { text-align: center; color: #94a3b8; font-size: 24rpx; padding: 24rpx 0 40rpx; }
```

文案：`加载中...`、`— 没有更多了 —`、`该店铺暂无优惠券` / `暂无优惠券`。

### 5.5 票据式券卡（couponlist / coupons 共用模式）

- 白卡 `22rpx` 圆角，左侧 `260rpx` 面额区 + 右侧信息区。
- 中缝上下半圆缺口 `::before/::after`，**缺口填充色必须等于页面背景色**。
- 券种主题渐变（左侧面额区）：
  - t1 满减券：`linear-gradient(140deg, #ff7a59, #ff3d5e)`
  - t2 折扣券：`linear-gradient(140deg, #38a0ff, #4f6bff)`
  - t3 首道门票：`linear-gradient(140deg, #23d3a3, #0ea5a5)`
  - t4 专属票价：`linear-gradient(140deg, #a78bfa, #7c3aed)`
- 置灰态（不满足门槛）：左侧 `#cbd5e1` 纯色，标题/chip 文字 `#94a3b8`，去阴影。

### 5.6 金额输入卡（coupons 消费页模式）

- 白卡容器内：顶部商家名（`30rpx/800/#0f172a`），下方内嵌浅灰区 `#f8fafc`、`16rpx` 圆角。
- 「消费总额」标题 `34rpx/800/#0f172a` + 右侧灰色提示 `24rpx/#94a3b8`。
- 输入框居中、大号加粗（`44rpx/800/#0f172a`），下边框 `1rpx solid #e2e8f0`，
  占位符 `#94a3b8`。

## 6. 导航栏约定

- 二级页面统一深色导航：`navigationBarBackgroundColor: "#1e3a8a"` + `navigationBarTextStyle: "white"`。
- 首页 `navigationStyle: "custom"` 自绘顶栏。
- 动态标题用 `uni.setNavigationBarTitle`（如优惠券页用商家名替换）。

## 7. 新页面自查清单

1. 颜色只取本文 slate 色板与品牌蓝，禁止自造 `#f7f8fa`、`#e5e8ef`、`#d8dce3` 之类的杂灰。
2. 白卡圆角 `24rpx`（券卡 `22rpx`）+ 对应阴影档位。
3. 文字层级对照 §2.2，标题 800/900、正文 600–700、辅助 400。
4. 列表页用 §5.1 骨架 + `auto-scroll`，空态/加载态文案样式统一。
5. 主按钮 `#2563eb`，禁用/置灰用 `#94a3b8 / #cbd5e1`。
6. 页面背景：券类 `#f1f5f9`，其余 `#f8fafc`；票据缺口色跟随页面背景。
7. 有分页的需要使用分页工具。