<template>
  <view class="page">
    <view class="qr-card">
      <text v-if="shopName" class="shop-name">{{ shopName }}</text>
      <text class="card-title">向商家出示核销码</text>

      <!-- 二维码主体 -->
      <view class="qr-box">
        <image v-if="qrUrl" class="qr-img" :src="qrUrl" mode="aspectFit" />
        <view v-else class="qr-placeholder">
          <text v-if="qrLoading" class="ph-text">生成中...</text>
          <text v-else-if="qrError" class="ph-text retry" @click="reload">{{ qrError }}，点击重试</text>
          <text v-else class="ph-text">准备中...</text>
        </view>
      </view>

      <text class="order-no">{{ orderNo }}</text>
      <text v-if="payAmount > 0" class="pay-amount">待核销 ¥{{ money(payAmount) }}</text>

      <!-- 30 秒倒计时：归零自动换新码 -->
      <view class="countdown">
        <view class="cd-bar">
          <view class="cd-inner" :style="{ width: percent + '%' }"></view>
        </view>
        <text class="cd-text">{{ seconds }} 秒后自动刷新</text>
      </view>

      <text class="tip">二维码会动态更新，截图无效；核销成功后本码立即失效</text>
      <!-- <text v-if="fromLocal" class="tip warn">当前由本地出签（/user/order/qrcode 未接入）</text> -->

      <button class="refresh-btn" :disabled="qrLoading" @click="reload">立即刷新</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrderQRCode } from '@/api/order.js'
import { generateOrderQRToken } from '@/utils/orderQR.js'
import { useSubmit } from '@/utils/submitGuard.js' // 统一防重复提交

// 二维码有效期（秒）：与后端签发有效期保持一致，到点自动换新码
const TTL = 30

const orderNo = ref('')
const shopName = ref('')
const payAmount = ref(0)

const qrUrl = ref('')
const qrError = ref('')
const seconds = ref(TTL)
// true 表示本张码由前端本地出签（后端接口不可用时兜底）
const fromLocal = ref(false)

const percent = computed(() => Math.round((seconds.value / TTL) * 100))

let timer = null

onLoad((query) => {
  const q = query || {}
  orderNo.value = q.order_no ? safeDecode(q.order_no) : ''
  shopName.value = q.shop_name ? safeDecode(q.shop_name) : ''
  payAmount.value = Number(q.amount) || 0
  reload()
})

onUnmounted(() => {
  stopCountdown()
})

function safeDecode(s) {
  try {
    return decodeURIComponent(s)
  } catch (e) {
    return s
  }
}

// 生成（或刷新）一张二维码的真正实现：由 useSubmit 统一加锁防重复
async function doReload() {
  stopCountdown()
  qrError.value = ''
  try {
    const content = await fetchQrContent()
    qrUrl.value = await renderQR(content)
  } catch (e) {
    qrUrl.value = ''
    qrError.value = (e && e.message) || '生成失败'
    console.error('[qrcode] 生成失败：', e)
  } finally {
    startCountdown()
  }
}

// 统一防重复提交：qrLoading 绑定到按钮 :disabled
const { loading: qrLoading, submit: doRefresh } = useSubmit(doReload, { cooldown: 500 })

// 生成（或刷新）入口：校验置于锁外
function reload() {
  if (!orderNo.value) {
    uni.showToast({ title: '订单信息缺失，请返回重试', icon: 'none' })
    return
  }
  doRefresh()
}

// 是否由后端出签。后端接口 POST /user/order/qrcode 尚未实现，
// 强行请求会一直挂到超时、导致二维码长时间空白，故默认关闭走本地出签；
// 后端接口就绪后把这里改成 true 即可切换，前端无需其它改动。
const USE_SERVER_QR = false

// 取二维码内容：后端出签（开启时）或本地出签
async function fetchQrContent() {
  if (USE_SERVER_QR) {
    const res = await getOrderQRCode({ order_no: orderNo.value })
    const d = res && res.data
    const serverContent = d && (d.qr_content || d.qrContent)
    if (serverContent) {
      fromLocal.value = false
      return String(serverContent)
    }
  }
  fromLocal.value = true
  return generateOrderQRToken(orderNo.value).qrContent
}

// ===== 30 秒倒计时 =====
function startCountdown() {
  stopCountdown()
  seconds.value = TTL
  timer = setInterval(() => {
    seconds.value -= 1
    if (seconds.value <= 0) {
      stopCountdown()
      reload() // 过期自动换新码
    }
  }, 1000)
}

function stopCountdown() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// 金额展示，去掉多余的尾数
function money(v) {
  return Number(Number(v || 0).toFixed(2))
}

// 按需加载本地二维码库（动态 import：库异常时只影响二维码区域，不会白屏整页）
let libPromise = null
function loadQrLib() {
  if (!libPromise) {
    libPromise = import('@/utils/qrcodeLib.js').then((m) => m.default || m)
  }
  return libPromise
}

// 文本 → dataURL（供 <image> 直接展示）
async function renderQR(text) {
  const qrcodeLib = await loadQrLib()
  const qr = qrcodeLib(0, 'M') // 0 = 自动选择版本，M 级纠错
  qr.addData(text)
  qr.make()
  return qr.createDataURL(8, 2)
}
</script>

<style lang="scss" scoped>
.page {
  position: fixed;
  top: var(--window-top, 44px);
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f8fafc;
  padding: 28rpx;
  box-sizing: border-box;
}

.qr-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx 36rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  text-align: center;

  .shop-name {
    display: block;
    font-size: 30rpx;
    font-weight: 800;
    color: #0f172a;
  }

  .card-title {
    display: block;
    margin-top: 10rpx;
    font-size: 26rpx;
    color: #64748b;
  }

  .qr-box {
    margin: 30rpx auto 0;
    width: 460rpx;
    height: 460rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border-radius: 16rpx;
    overflow: hidden;

    .qr-img {
      width: 460rpx;
      height: 460rpx;
    }

    .qr-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;

      .ph-text {
        font-size: 26rpx;
        color: #94a3b8;
      }

      .retry {
        color: #2563eb;
        font-weight: 700;
      }
    }
  }

  .pay-amount {
    display: block;
    margin-top: 10rpx;
    font-size: 28rpx;
    font-weight: 800;
    color: #ff2d55;
  }

  .order-no {
    display: block;
    margin-top: 24rpx;
    font-size: 32rpx;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 2rpx;
  }

  /* 倒计时：进度条 + 剩余秒数 */
  .countdown {
    margin-top: 28rpx;

    .cd-bar {
      height: 8rpx;
      border-radius: 999rpx;
      background: #f1f5f9;
      overflow: hidden;

      .cd-inner {
        height: 100%;
        background: linear-gradient(90deg, #2563eb, #1d4ed8);
        border-radius: 999rpx;
        transition: width 0.3s linear;
      }
    }

    .cd-text {
      display: block;
      margin-top: 12rpx;
      font-size: 24rpx;
      color: #64748b;
    }
  }

  .tip {
    display: block;
    margin-top: 28rpx;
    font-size: 22rpx;
    color: #94a3b8;
    line-height: 1.6;
  }

  .warn {
    margin-top: 10rpx;
    color: #b45309;
  }

  .refresh-btn {
    margin: 32rpx auto 0;
    width: 320rpx;
    height: 84rpx;
    line-height: 84rpx;
    border-radius: 999rpx;
    background: #2563eb;
    color: #fff;
    font-size: 30rpx;
    font-weight: 800;
    border: none;

    &::after {
      border: none;
    }
  }
}
</style>
