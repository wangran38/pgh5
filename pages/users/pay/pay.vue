<template>
  <view class="page">
    <!-- 订单金额卡 -->
    <view class="amount-card">
      <text v-if="shopName" class="shop-name">{{ shopName }}</text>
      <text class="amount-title">待支付金额</text>
      <view class="amount-main">
        <text class="symbol">¥</text>
        <text class="amount-num">{{ money(payAmount) }}</text>
      </view>
      <text class="amount-sub">
        {{ discountAmount > 0 ? `已优惠 ¥${money(discountAmount)} · 原价 ¥${money(totalAmount)}` : `订单号 ${orderNo}` }}
      </text>
    </view>

    <!-- 支付方式 -->
    <view class="payway-card">
      <text class="card-title">选择支付方式</text>

      <view
        v-for="w in PAY_WAYS"
        :key="w.value"
        class="payway-item"
        :class="{ on: payType === w.value }"
        @click="payType = w.value"
      >
        <text class="pw-icon">{{ w.icon }}</text>
        <view class="pw-main">
          <text class="pw-name">{{ w.label }}</text>
          <text class="pw-desc">{{ w.desc }}</text>
        </view>
        <view class="check-circle" :class="{ on: payType === w.value }">
          <text v-if="payType === w.value" class="check-mark">✓</text>
        </view>
      </view>
    </view>

    <!-- 底部结算栏 -->
    <view class="pay-bar">
      <view class="pay-info">
        <view class="pay-row">
          <text class="pay-label">{{ payType === PAY_TYPE.CASH ? '到店应付' : '实付金额' }}</text>
          <text class="pay-amount">¥{{ money(payAmount) }}</text>
        </view>
        <text class="pay-tip">
          {{ payType === PAY_TYPE.CASH ? '到店向商家付款后核销' : '确认后立即完成付款' }}
        </text>
      </view>
      <button
        class="pay-btn"
        :class="{ cash: payType === PAY_TYPE.CASH }"
        :disabled="submitting"
        @click="onConfirm"
      >
        {{ submitting ? '处理中...' : (payType === PAY_TYPE.CASH ? '确认到店付现' : '确认支付') }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { PAY_TYPE, payTypeText, updateOrderPayType } from '@/api/order.js'
import { pay, PAY_CHANNELS } from '@/utils/payment.js'

// 两种方式的差别只在付款环节：在线支付当场付，到店付现下单后线下结算，
// 二者后续都由商家核销（票根/优惠券），见 api/order.js PAY_TYPE
const PAY_WAYS = [
  { value: PAY_TYPE.ONLINE, icon: '💳', label: payTypeText(PAY_TYPE.ONLINE), desc: '立即在线付款，付款成功后商家核销票根与优惠券' },
  { value: PAY_TYPE.CASH, icon: '💵', label: payTypeText(PAY_TYPE.CASH), desc: '到店向商家付款，订单创建后由商家核销订单、票根与优惠券' }
]

const orderId = ref(null)
const orderNo = ref('')
const shopName = ref('')
const payAmount = ref(0)
const totalAmount = ref(0)
const discountAmount = ref(0)

const payType = ref(PAY_TYPE.ONLINE)
const submitting = ref(false)

onLoad((query) => {
  const q = query || {}
  orderId.value = Number(q.order_id) || null
  orderNo.value = q.order_no ? String(q.order_no) : ''
  shopName.value = q.shop_name ? safeDecode(q.shop_name) : ''
  payAmount.value = Number(q.amount) || 0
  totalAmount.value = Number(q.total) || 0
  discountAmount.value = Number(q.discount) || 0
})

function safeDecode(s) {
  try {
    return decodeURIComponent(s)
  } catch (e) {
    return s
  }
}

// 确认：先记账本单支付方式，再按方式走付款或线下结算
async function onConfirm() {
  if (submitting.value) return
  if (!orderId.value) {
    uni.showToast({ title: '订单信息缺失，请返回重试', icon: 'none' })
    return
  }
  submitting.value = true

  // 1. 告知后端本单采用的支付方式
  const res = await updateOrderPayType({
    order_id: orderId.value,
    order_no: orderNo.value,
    pay_type: Number(payType.value)
  })
  if (!res) {
    submitting.value = false
    return // 失败已由 request.js 统一提示
  }

  // 2a. 到店付现：到此为止，等待到店付款 + 商家核销
  if (payType.value === PAY_TYPE.CASH) {
    uni.showToast({ title: '已选择到店付现，请向商家出示订单核销', icon: 'none' })
    gotoOrderList(1500)
    submitting.value = false
    return
  }

  // 2b. 在线支付：选择渠道后调起支付
  const channel = await choosePayChannel()
  if (!channel) {
    uni.showToast({ title: '已保留订单，可在「我的订单」继续支付', icon: 'none' })
    submitting.value = false
    return
  }

  try {
    const result = await pay({ orderId: orderId.value, orderNo: orderNo.value, channel })
    uni.showToast({
      title: result === 'pending' ? '支付已发起，请完成支付' : '支付成功',
      icon: result === 'pending' ? 'none' : 'success'
    })
    gotoOrderList(1200)
  } catch (e) {
    if (e && e.silent) {
      // 获取支付参数失败，request.js 已提示
    } else if (e && e.message === 'cancel') {
      uni.showToast({ title: '已取消支付', icon: 'none' })
    } else {
      uni.showToast({ title: (e && e.message) || '支付失败', icon: 'none' })
    }
  } finally {
    submitting.value = false
  }
}

// 完成后回到订单列表：从订单页进来就直接返回（列表 onShow 会自动刷新），
// 从买单页 redirectTo 过来的则重定向到订单列表
function gotoOrderList(delay) {
  setTimeout(() => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const prev = pages[pages.length - 2]
    if (prev && prev.route && String(prev.route).indexOf('users/order/order') > -1) {
      uni.navigateBack()
    } else {
      uni.redirectTo({ url: '/pages/users/order/order' })
    }
  }, delay)
}

// 弹出支付渠道选择；取消返回 null
function choosePayChannel() {
  return new Promise((resolve) => {
    uni.showActionSheet({
      itemList: PAY_CHANNELS.map((c) => c.label),
      success: (r) => {
        const hit = PAY_CHANNELS[r.tapIndex]
        resolve(hit ? hit.value : null)
      },
      fail: () => resolve(null)
    })
  })
}

// 金额展示，去掉多余的尾数（550 / 550.5）
function money(v) {
  return Number(Number(v || 0).toFixed(2))
}
</script>

<style lang="scss" scoped>
.page {
  /* fixed 而非 100vh：手机动态地址栏下 100vh 大于可视高度会让页面级滚动抢手势 */
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

/* ===== 订单金额卡 ===== */
.amount-card {
  flex-shrink: 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 28rpx 36rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  text-align: center;

  .shop-name {
    display: block;
    font-size: 30rpx;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 24rpx;
  }

  .amount-title {
    display: block;
    font-size: 26rpx;
    color: #64748b;
  }

  .amount-main {
    margin-top: 16rpx;
    display: flex;
    align-items: baseline;
    justify-content: center;

    .symbol {
      font-size: 36rpx;
      font-weight: 800;
      color: #0f172a;
      margin-right: 6rpx;
    }

    .amount-num {
      font-size: 76rpx;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
    }
  }

  .amount-sub {
    display: block;
    margin-top: 18rpx;
    font-size: 24rpx;
    color: #94a3b8;
  }
}

/* ===== 支付方式 ===== */
.payway-card {
  flex-shrink: 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 26rpx 28rpx 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .card-title {
    display: block;
    font-size: 30rpx;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 20rpx;
  }

  .payway-item {
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 16rpx;
    padding: 22rpx 24rpx;
    margin-bottom: 18rpx;

    &.on {
      background: #eff6ff;
      border-color: #2563eb;
    }

    .pw-icon {
      flex-shrink: 0;
      font-size: 44rpx;
      line-height: 1;
      margin-right: 20rpx;
    }

    .pw-main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;

      .pw-name {
        font-size: 28rpx;
        font-weight: 800;
        color: #0f172a;
      }

      .pw-desc {
        margin-top: 6rpx;
        font-size: 22rpx;
        color: #64748b;
        line-height: 1.4;
      }
    }
  }
}

/* 勾选圈（与券卡、票根弹层共用样式） */
.check-circle {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 3rpx solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: #fff;
  flex-shrink: 0;

  &.on {
    background: #2563eb;
    border-color: #2563eb;
  }

  .check-mark {
    color: #fff;
    font-size: 24rpx;
    font-weight: 900;
    line-height: 1;
  }
}

/* ===== 底部结算栏 ===== */
.pay-bar {
  flex-shrink: 0;
  /* 负外边距抵消页面 padding，通栏贴底 */
  margin: auto -28rpx -28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(15, 23, 42, 0.06);

  .pay-info {
    .pay-row {
      display: flex;
      align-items: baseline;
    }

    .pay-label {
      font-size: 28rpx;
      font-weight: 700;
      color: #0f172a;
      margin-right: 12rpx;
    }

    .pay-amount {
      font-size: 44rpx;
      font-weight: 900;
      color: #ff2d55;
      line-height: 1.1;
    }

    .pay-tip {
      display: block;
      margin-top: 6rpx;
      font-size: 24rpx;
      color: #94a3b8;
    }
  }

  .pay-btn {
    margin: 0;
    width: 280rpx;
    height: 84rpx;
    line-height: 84rpx;
    border-radius: 999rpx;
    background: linear-gradient(90deg, #ff5c7c, #ff2d55);
    color: #fff;
    font-size: 30rpx;
    font-weight: 800;
    border: none;

    &::after {
      border: none;
    }

    /* 到店付现用品牌蓝，与「在线支付」粉色区分 */
    &.cash {
      background: linear-gradient(90deg, #2563eb, #1d4ed8);
    }
  }
}
</style>
