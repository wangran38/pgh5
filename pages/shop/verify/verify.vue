<template>
  <view class="page">
    <!-- 核销操作卡（固定）：仅订单核销，扫描/输入订单号 -->
    <view class="verify-card">
      <view class="card-head">
        <text class="card-title">订单核销</text>
        <text class="card-hint">扫描用户输入二维码得到的订单号</text>
      </view>

      <view class="code-row">
        <input
          v-model="code"
          class="code-input"
          type="text"
          placeholder="请输入订单号"
          placeholder-class="code-ph"
          confirm-type="done"
          @confirm="doVerify"
        />
        <text v-if="code" class="code-clear" @click="code = ''">✕</text>
      </view>

      <view class="btn-row">
        <button class="scan-btn" @click="doScan">扫码</button>
        <button class="verify-btn" :disabled="submitting" @click="doVerify">
          {{ submitting ? '核销中...' : '确认核销' }}
        </button>
      </view>

      <!-- 核销结果反馈 -->
      <view v-if="result" class="result-box" :class="result.ok ? 'ok' : 'bad'">
        <text class="result-title">{{ result.ok ? '✓ 核销成功' : '✗ 核销失败' }}</text>
        <text v-if="result.title" class="result-line">{{ result.title }}</text>
        <text v-if="result.amount != null" class="result-line">
          {{ result.amountLabel || '优惠金额' }} ¥{{ result.amount }}
        </text>
        <text v-if="result.extra" class="result-line">{{ result.extra }}</text>
        <text v-if="result.msg" class="result-line">{{ result.msg }}</text>
      </view>
    </view>

    <!-- 已核销订单 -->
    <view class="section-head">
      <text class="section-title">已核销订单</text>
      <text v-if="total > 0" class="section-count">共 {{ total }} 条</text>
    </view>

    <auto-scroll
      ref="scrollRef"
      refresher-enabled
      :refresher-triggered="listRefreshing"
      @refresherrefresh="onAutoRefresh"
      @scrolltolower="onLower"
    >
      <view v-if="loading && list.length === 0" class="state-text">加载中...</view>

      <template v-else-if="list.length > 0">
        <view v-for="r in list" :key="r.id" class="record-card">
          <view class="record-main">
            <text class="record-title">{{ r.order_no }}</text>
            <text class="record-code">实付 ¥{{ money(r.payable_amount) }}</text>
          </view>
          <view class="record-right">
            <text class="record-amount">-¥{{ money(r.discount_amount) }}</text>
            <text class="record-time">{{ fmtTime(r.verified_at || r.created_at) }}</text>
          </view>
        </view>

        <view class="load-more">
          <text v-if="loading">加载中...</text>
          <text v-else-if="finished">— 没有更多了 —</text>
        </view>
      </template>

      <view v-else-if="!loading" class="state-text">暂无已核销订单</view>
    </auto-scroll>

    <!-- 实时扫码遮罩（H5 由 html5-qrcode 渲染摄像头画面到动态容器） -->
    <view v-if="scanVisible" ref="scanMaskRef" class="scan-mask">
      <text class="scan-tip">将二维码放入框内，自动识别</text>
      <text class="scan-close" @click="closeScan">✕</text>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { verifyOrder, getShopOrderList } from '@/api/order.js'
import { takeLastErrorBody, pickErrMsg } from '@/utils/request.js'
import { parseOrderQR } from '@/utils/orderQR.js'
import { Html5Qrcode } from '@/utils/html5QrcodeLib.js'
import { usePageList } from '@/utils/usePageList.js'
import { useSubmit } from '@/utils/submitGuard.js' // 统一防重复提交
import AutoScroll from '@/components/auto-scroll/auto-scroll.vue'

const shopId = ref(null)
const code = ref('')
// 最近一次扫码解析结果（动态码带 timestamp/sign，输入框只回填订单号，签名暂存此处）
const lastScan = ref(null)
// 核销结果：{ ok, title, amount, msg }
const result = ref(null)
const scrollRef = ref(null)
const listRefreshing = ref(false)

// ===== 相机扫码（H5 用 html5-qrcode 实时扫码，其它端由 uni.scanCode 处理）=====
const scanVisible = ref(false)
const scanMaskRef = ref(null)
let qrScanner = null    // Html5Qrcode 实例
let readerBoxEl = null  // 库渲染摄像头画面的容器

// 列表数据：已核销订单（status 3）
const { list, total, loading, finished, refresh, loadMore } = usePageList((p) =>
  getShopOrderList({ page: p.page, limit: p.limit, status: 3 })
)

// 列表数据变化后重新测量容器
watch(list, async () => {
  await nextTick()
  if (scrollRef.value && scrollRef.value.sync) scrollRef.value.sync()
})

onLoad((query) => {
  shopId.value = Number(query && query.shop_id) || null
  refresh()
})

// 执行订单核销（真正调用接口，由 useSubmit 加锁防重复）
async function runVerifyOrder(val) {
  result.value = null

  const res = await verifyOrder(buildOrderParams(val))

  if (res && res.data) {
    result.value = buildOrderResult(res.data, val)
    code.value = ''
    refresh() // 成功后刷新列表
  } else {
    // 优先展示后端返回的 message（如「订单不存在」「该订单已核销」），
    // 网络异常等拿不到后端信息的场景才用兜底文案
    const serverMsg = pickErrMsg(takeLastErrorBody())
    result.value = {
      ok: false,
      msg: serverMsg || '核销失败，请确认订单号是否正确或是否已核销'
    }
  }
}

// 统一防重复提交：核销中忽略再次点击
const { loading: submitting, submit: submitVerify } = useSubmit(runVerifyOrder, { cooldown: 800 })

// 核销入口（按钮 / 输入框回车 / 扫码回调都经此）：校验置于锁外，失败不占用冷却
function doVerify() {
  const val = code.value.trim()
  if (!val) {
    uni.showToast({ title: '请输入订单号', icon: 'none' })
    return
  }
  submitVerify(val)
}

// 组装订单核销参数：三个字段固定全传
//   扫码（动态码）：timestamp、sign 取二维码里的真实值
//   手动输入（静态码）：timestamp 传 0、sign 传空串，由后端按免签处理
function buildOrderParams(val) {
  const scanned = lastScan.value
  const payload = scanned && scanned.order_no === val ? scanned : parseOrderQR(val)
  return {
    order_no: payload.order_no || val,
    timestamp: Number(payload.timestamp) || 0,
    sign: payload.sign || ''
  }
}

// 订单核销成功的结果展示
function buildOrderResult(d, fallbackNo) {
  const discount = Number(d.discount_amount) || 0
  return {
    ok: true,
    title: `订单 ${d.order_no || fallbackNo}`,
    amount: d.payable_amount ?? d.amount ?? null,
    amountLabel: '实付金额',
    extra: discount > 0 ? `已优惠 ¥${money(discount)}` : ''
  }
}

// 扫码核销：H5 用浏览器相机 + 解码，其它端用 uni.scanCode
function doScan() {
  // #ifdef H5
  openScan()
  return
  // #endif
  // #ifndef H5
  uni.scanCode({
    scanType: ['qrCode', 'barCode'],
    success: (r) => {
      if (r && r.result) {
        code.value = r.result
        doVerify()
      }
    },
    fail: () => {}
  })
  // #endif
}

// 打开扫码：浏览器支持摄像头才启用实时扫码（需 HTTPS 或 localhost），
// 不支持直接提示，不再有拍照兜底
function openScan() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') {
    uni.showToast({ title: '当前环境不支持扫码，请手动输入', icon: 'none' })
    return
  }
  const ok =
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
  if (!ok) {
    uni.showToast({
      title: '当前浏览器不支持摄像头扫码（需 HTTPS），请手动输入',
      icon: 'none'
    })
    return
  }
  startScan()
}

// 启动实时扫码：摄像头与解码交给 html5-qrcode
async function startScan() {
  scanVisible.value = true
  await nextTick()

  const inst = scanMaskRef.value
  const maskEl = inst && (inst.$el || inst)
  if (!maskEl || !Html5Qrcode) {
    uni.showToast({ title: '扫码组件初始化失败，请手动输入', icon: 'none' })
    scanVisible.value = false
    return
  }

  // 库需要往真实 DOM 容器里渲染 video，动态创建避免 uni 组件包装
  readerBoxEl = document.createElement('div')
  readerBoxEl.id = 'qr-reader-box-' + Date.now()
  readerBoxEl.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;'
  maskEl.insertBefore(readerBoxEl, maskEl.firstChild)

  qrScanner = new Html5Qrcode(readerBoxEl.id, false)
  try {
    await qrScanner.start(
      { facingMode: 'environment' }, // 优先后置摄像头
      { fps: 10, qrbox: { width: 240, height: 240 } }, // 与页面自绘 480rpx 框对齐
      (decodedText) => {
        // 识别成功：停相机 → 回填 → 自动核销
        closeScan()
        applyScanText(decodedText)
        doVerify()
      },
      () => {} // 未识别到二维码的持续回调，忽略即可
    )
  } catch (e) {
    const name = (e && (e.name || e.code)) || ''
    const denied = name === 'NotAllowedError' || name === 'SecurityError'
    uni.showToast({
      title: denied ? '相机权限被拒绝，请在浏览器设置中允许' : '无法启动相机，请手动输入',
      icon: 'none'
    })
    closeScan()
  }
}

// 回填扫码内容：输入框只显示订单号，签名与时间戳暂存 lastScan 供提交时使用
function applyScanText(text) {
  const raw = String(text == null ? '' : text).trim()
  if (!raw) return
  const parsed = parseOrderQR(raw)
  lastScan.value = parsed
  code.value = parsed.order_no || raw
}

// 关闭扫码：停相机（释放摄像头）→ 清库内 DOM → 移除容器
async function closeScan() {
  const s = qrScanner
  qrScanner = null
  if (s) {
    try {
      // 2 = SCANNING；未启动过则无需 stop
      if (!s.getState || s.getState() === 2) await s.stop()
    } catch (e) {}
    try {
      s.clear()
    } catch (e) {}
  }
  if (readerBoxEl && readerBoxEl.parentNode) {
    readerBoxEl.parentNode.removeChild(readerBoxEl)
  }
  readerBoxEl = null
  scanVisible.value = false
}

// 离开页面时释放相机
onUnmounted(() => {
  if (scanVisible.value) closeScan()
})

// 容器内下拉刷新
async function onAutoRefresh() {
  listRefreshing.value = true
  try {
    await refresh()
  } finally {
    listRefreshing.value = false
  }
}

// 容器触底加载更多
function onLower() {
  loadMore()
}

// 金额展示，去掉多余尾数
function money(v) {
  return Number(Number(v || 0).toFixed(2))
}

// 兼容三种时间格式：秒级时间戳 / 毫秒时间戳 / "2026-09-08T17:12:02+08:00"
function fmtTime(v) {
  if (!v) return ''
  const raw = String(v)
  if (/^\d+$/.test(raw)) {
    const n = Number(raw)
    const ms = raw.length <= 10 ? n * 1000 : n
    const d = new Date(ms)
    if (!isNaN(d.getTime())) {
      const p = (x) => String(x).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }
    return raw
  }
  return raw.replace('T', ' ').slice(0, 16)
}
</script>

<style lang="scss" scoped>
.page {
  /* fixed 而非 100vh：手机动态地址栏下 100vh 大于可视高度会让 body 可滚，
     下拉手势被页面级滚动接管，scroll-view 的 refresher 拉不起来。
     top 用 --window-top 避开系统导航栏 */
  position: fixed;
  top: var(--window-top, 44px);
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f1f5f9;
  padding: 24rpx;
  box-sizing: border-box;
}

/* ===== 核销操作卡 ===== */
.verify-card {
  flex-shrink: 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .card-head {
    display: flex;
    align-items: baseline;

    .card-title {
      font-size: 34rpx;
      font-weight: 800;
      color: #0f172a;
      margin-right: 16rpx;
    }

    .card-hint {
      font-size: 24rpx;
      color: #94a3b8;
    }
  }

  .code-row {
    display: flex;
    align-items: center;
    background: #f8fafc;
    border-radius: 16rpx;
    padding: 0 24rpx;
    height: 96rpx;
    margin-top: 24rpx;

    .code-input {
      flex: 1;
      font-size: 32rpx;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 2rpx;
    }

    .code-ph {
      font-size: 28rpx;
      font-weight: 400;
      color: #94a3b8;
      letter-spacing: 0;
    }

    .code-clear {
      font-size: 26rpx;
      color: #cbd5e1;
      padding-left: 16rpx;
    }
  }

  .btn-row {
    display: flex;
    gap: 20rpx;
    margin-top: 24rpx;

    .scan-btn,
    .verify-btn {
      flex: 1;
      height: 88rpx;
      line-height: 88rpx;
      border-radius: 16rpx;
      font-size: 30rpx;
      font-weight: 800;
      border: none;

      &::after {
        border: none;
      }
    }

    .scan-btn {
      background: #fff;
      color: #2563eb;
      border: 2rpx solid #2563eb;
    }

    .verify-btn {
      background: #2563eb;
      color: #fff;

      &[disabled] {
        background: #93b4f5;
        color: #fff;
      }
    }
  }

  /* 核销结果 */
  .result-box {
    margin-top: 24rpx;
    border-radius: 16rpx;
    padding: 24rpx;

    &.ok {
      background: #dcfce7;

      .result-title {
        color: #15803d;
      }

      .result-line {
        color: #166534;
      }
    }

    &.bad {
      background: #fef2f2;

      .result-title {
        color: #dc2626;
      }

      .result-line {
        color: #b91c1c;
      }
    }

    .result-title {
      display: block;
      font-size: 30rpx;
      font-weight: 800;
    }

    .result-line {
      display: block;
      margin-top: 10rpx;
      font-size: 26rpx;
    }
  }
}

/* ===== 相机扫码遮罩 ===== */
.scan-mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: #000;
  z-index: 999;
  overflow: hidden;

  /* 扫描框由 html5-qrcode 自己绘制（qrbox），这里不再自绘，避免两层框错位 */

  .scan-tip {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 160rpx;
    text-align: center;
    font-size: 26rpx;
    color: #fff;
    z-index: 2;
  }

  .scan-close {
    position: absolute;
    top: 40rpx;
    right: 40rpx;
    width: 64rpx;
    height: 64rpx;
    line-height: 64rpx;
    text-align: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
    font-size: 30rpx;
    z-index: 2;
  }
}

/* ===== 记录区标题 ===== */
.section-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 16rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: 800;
    color: #0f172a;
  }

  .section-count {
    font-size: 24rpx;
    color: #94a3b8;
  }
}

.state-text {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding: 100rpx 0;
}

/* ===== 核销记录卡 ===== */
.record-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .record-main {
    flex: 1;
    min-width: 0;
    margin-right: 20rpx;

    .record-title {
      display: block;
      font-size: 28rpx;
      font-weight: 800;
      color: #0f172a;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .record-code {
      display: block;
      margin-top: 8rpx;
      font-size: 22rpx;
      color: #94a3b8;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  .record-right {
    flex-shrink: 0;
    text-align: right;

    .record-amount {
      display: block;
      font-size: 30rpx;
      font-weight: 900;
      color: #ff2d55;
    }

    .record-time {
      display: block;
      margin-top: 8rpx;
      font-size: 22rpx;
      color: #94a3b8;
    }
  }
}

.load-more {
  text-align: center;
  padding: 24rpx 0 40rpx;
  font-size: 24rpx;
  color: #94a3b8;
}
</style>
