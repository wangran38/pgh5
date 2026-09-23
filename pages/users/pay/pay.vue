<template>
  <view class="page">
    <scroll-view class="content-scroll" scroll-y>
    <!-- 订单金额卡：团购下单（有快照）时隐藏，金额已在「费用明细」展示，避免重复 -->
    <view v-if="!snapshot" class="amount-card">
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

    <!-- 商品信息卡（来自下单页快照，读不到则不显示） -->
    <view v-if="snapshot" class="goods-card">
      <image v-if="snapshot.goods_cover" class="g-cover" :src="snapshot.goods_cover" mode="aspectFill" />
      <view class="g-body">
        <text class="g-title">{{ snapshot.goods_title || '团购商品' }}</text>
        <text v-if="snapshot.sku_name" class="g-sku">{{ snapshot.sku_name }}</text>
        <text v-if="snapshot.date_text" class="g-date">{{ snapshot.date_text }}</text>
        <view v-if="snapshot.tags && snapshot.tags.length" class="g-tags">
          <text v-for="(t, i) in snapshot.tags" :key="i" class="g-chip">{{ t }}</text>
        </view>
      </view>
    </view>

    <!-- 费用明细（合计以订单实付金额为准，不取快照） -->
    <view v-if="snapshot" class="detail-card">
      <text class="card-title">费用明细</text>
      <view class="d-row">
        <text class="d-label">参考价</text>
        <text class="d-value">¥{{ money(snapshot.original_total) }}</text>
      </view>
      <view v-if="snapshot.group_discount > 0" class="d-row">
        <text class="d-label">团购优惠</text>
        <text class="d-value cut">-¥{{ money(snapshot.group_discount) }}</text>
      </view>
      <view class="d-row">
        <text class="d-label">优惠券</text>
        <text class="d-value muted">暂无可用</text>
      </view>
      <view class="d-row">
        <text class="d-label">数量</text>
        <text class="d-value">×{{ snapshot.quantity }}</text>
      </view>
      <view class="d-row total">
        <text class="d-label">合计</text>
        <text class="d-value">¥{{ money(payAmount) }}</text>
      </view>
      <view class="d-row">
        <text class="d-label">订单号</text>
        <view class="d-order">
          <text class="order-no">{{ orderNo || '-' }}</text>
          <text v-if="orderNo" class="copy-btn" @click.stop="copyOrderNo">复制</text>
        </view>
      </view>
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

      <view class="bottom-padding"></view>
    </scroll-view>

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
import { useSubmit } from '@/utils/submitGuard.js' // 统一防重复提交

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

// ===== 商品快照（由下单页 /pages/shop/goods/detail 写入，纯展示用）=====
// 未读到（如从订单列表、优惠买单进入）则整块隐藏，退回原有简洁样式。
// ⚠️ key 需与 pages/shop/goods/detail.vue 保持一致
const PAY_SNAPSHOT_KEY = 'pay_snapshot'
const snapshot = ref(null)

function clearSnapshot() {
  try {
    uni.removeStorageSync(PAY_SNAPSHOT_KEY)
  } catch (e) {
    console.warn('清除支付快照失败:', e)
  }
}

function readSnapshot(orderNo) {
  try {
    const s = uni.getStorageSync(PAY_SNAPSHOT_KEY)
    if (!s || typeof s !== 'object') return null
    // 快照必须属于当前订单，否则视为上一笔的残留（避免串单显示别人的商品）
    if (orderNo && s.order_no && String(s.order_no) !== String(orderNo)) {
      clearSnapshot()
      return null
    }
    return s
  } catch (e) {
    return null
  }
}

onLoad((query) => {
  const q = query || {}
  orderId.value = Number(q.order_id) || null
  orderNo.value = q.order_no ? String(q.order_no) : ''
  shopName.value = q.shop_name ? safeDecode(q.shop_name) : ''
  payAmount.value = Number(q.amount) || 0
  totalAmount.value = Number(q.total) || 0
  discountAmount.value = Number(q.discount) || 0
  snapshot.value = readSnapshot(orderNo.value)
})

function safeDecode(s) {
  try {
    return decodeURIComponent(s)
  } catch (e) {
    return s
  }
}

// 确认支付接口调用（不含校验）：由 useSubmit 统一加锁防重复
async function confirmPay() {
  // 1. 告知后端本单采用的支付方式（按订单号记账）
  const res = await updateOrderPayType({
    order_no: orderNo.value,
    pay_type: Number(payType.value)
  })
  if (!res) return // 失败已由 request.js 统一提示

  // 2a. 到店付现：跳出示核销码页，商家扫码核销后完成
  if (payType.value === PAY_TYPE.CASH) {
    clearSnapshot() // 订单已创建，快照使命完成，避免残留被下一单误读
    uni.redirectTo({
      url:
        '/pages/users/order/qrcode?order_no=' + encodeURIComponent(orderNo.value) +
        '&amount=' + payAmount.value +
        '&shop_name=' + encodeURIComponent(shopName.value || '')
    })
    return
  }

  // 2b. 在线支付：选择渠道后调起支付
  // ⚠️ 后端 /user/order/pay 尚未实现在线付款，此处保留完整流程待后端就绪；
  //    目前点击会由 request.js 提示失败，不影响到店付现链路。
  const channel = await choosePayChannel()
  if (!channel) {
    uni.showToast({ title: '已保留订单，可在「我的订单」继续支付', icon: 'none' })
    return
  }

  try {
    const result = await pay({ orderId: orderId.value, orderNo: orderNo.value, channel })
    uni.showToast({
      title: result === 'pending' ? '支付已发起，请完成支付' : '支付成功',
      icon: result === 'pending' ? 'none' : 'success'
    })
    clearSnapshot() // 支付完成，清除快照
    gotoOrderList(1200)
  } catch (e) {
    if (e && e.silent) {
      // 获取支付参数失败，request.js 已提示
    } else if (e && e.message === 'cancel') {
      uni.showToast({ title: '已取消支付', icon: 'none' })
    } else {
      uni.showToast({ title: (e && e.message) || '支付失败', icon: 'none' })
    }
  }
}

// 统一防重复提交：submitting 绑定到按钮 :disabled
const { loading: submitting, submit: doConfirm } = useSubmit(confirmPay, { cooldown: 1000 })

// 确认入口：校验置于锁外，失败不占用冷却
function onConfirm() {
  if (!orderNo.value) {
    uni.showToast({ title: '订单信息缺失，请返回重试', icon: 'none' })
    return
  }
  doConfirm()
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

// 复制订单号：便于用户去订单列表/客服查询
function copyOrderNo() {
  if (!orderNo.value) return
  uni.setClipboardData({
    data: orderNo.value,
    success: () => {
      uni.showToast({ title: '订单号已复制', icon: 'none' })
    }
  })
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

/* 内容滚动区：新增商品卡/明细后小屏也能滚，底部结算栏保持固定 */
.content-scroll {
	flex: 1;
	min-height: 0;
	height: 0;
	overscroll-behavior: none;
}

.bottom-padding {
	height: 40rpx;
}

/* ===== 商品信息卡 ===== */
.goods-card {
	display: flex;
	background: #fff;
	border-radius: 24rpx;
	padding: 24rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

	.g-cover {
		width: 140rpx;
		height: 140rpx;
		border-radius: 16rpx;
		background: #e2e8f0;
		flex-shrink: 0;
		margin-right: 20rpx;
	}

	.g-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.g-title {
		font-size: 30rpx;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.4;
	}

	.g-sku,
	.g-date {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #64748b;
	}

	.g-tags {
		display: flex;
		flex-wrap: wrap;
		margin-top: 12rpx;

		.g-chip {
			font-size: 20rpx;
			color: #475569;
			background: #f1f5f9;
			border-radius: 6rpx;
			padding: 4rpx 12rpx;
			margin: 0 12rpx 8rpx 0;
		}
	}
}

/* ===== 费用明细卡 ===== */
.detail-card {
	background: #fff;
	border-radius: 24rpx;
	padding: 26rpx 28rpx 12rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

	.card-title {
		display: block;
		font-size: 30rpx;
		font-weight: 800;
		color: #0f172a;
		margin-bottom: 18rpx;
	}

	.d-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 14rpx 0;

		.d-label {
			font-size: 26rpx;
			color: #64748b;
		}

		.d-value {
			font-size: 26rpx;
			font-weight: 700;
			color: #0f172a;

			&.cut {
				color: #ff2d55;
			}

			&.muted {
				color: #94a3b8;
				font-weight: 400;
			}
		}

		/* 订单号 + 复制 */
		.d-order {
			display: flex;
			align-items: center;
			flex: 1;
			justify-content: flex-end;
			margin-left: 24rpx;

			.order-no {
				font-size: 24rpx;
				color: #475569;
				word-break: break-all;
				text-align: right;
			}

			.copy-btn {
				flex-shrink: 0;
				margin-left: 16rpx;
				font-size: 22rpx;
				font-weight: 700;
				color: #2563eb;
				background: #eff6ff;
				border: 1rpx solid #93c5fd;
				border-radius: 999rpx;
				padding: 4rpx 16rpx;
			}
		}

		&.total {
			border-top: 2rpx solid #f1f5f9;
			margin-top: 8rpx;

			.d-value {
				font-size: 32rpx;
				font-weight: 900;
				color: #ff2d55;
			}
		}
	}
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
  /* 负外边距抵消页面 padding，通栏贴底（上方由 .content-scroll 撑开） */
  margin: 0 -28rpx -28rpx;
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
