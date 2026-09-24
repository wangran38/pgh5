<template>
  <view class="page">
    <!-- 消费总额输入卡片（固定） -->
    <view class="amount-card">
      <text v-if="shopName" class="amount-shop">{{ shopName }}</text>
      <view class="amount-box">
        <view class="amount-head">
          <text class="amount-title">消费总额</text>
          <text class="amount-hint">请询问服务员后输入</text>
        </view>
        <input
          v-model="amountInput"
          class="amount-input"
          type="digit"
          placeholder="请输入金额"
          placeholder-style="color:#cbd5e1;font-size:40rpx;font-weight:400"
        />
      </view>
    </view>

    <!-- 使用票根（固定） -->
    <view class="ticket-card" @click="openTicketPicker">
      <view class="ticket-label">
        <text class="ticket-title">使用票根</text>
        <text class="ticket-hint">
          {{ pickedTicketId != null ? '已选票根，可使用优惠券' : '选票根后才能使用优惠券' }}
        </text>
      </view>
      <view class="ticket-value">
        <template v-if="pickedTicket">
          <text class="ticket-name">{{ pickedTicket.title || '票根' }}</text>
          <text class="ticket-status">已选</text>
        </template>
        <text v-else class="ticket-placeholder">请选择票根</text>
        <text class="ticket-arrow">›</text>
      </view>
    </view>

    <!-- 自动滚动容器：内容排满才可滚；自带下拉刷新与触底加载 -->
    <auto-scroll
      ref="scrollRef"
      refresher-enabled
      :refresher-triggered="listRefreshing"
      @refresherrefresh="onAutoRefresh"
      @scrolltolower="onLower"
    >
      <!-- 未选票根时优惠券整体不可用，给出明确原因 -->
      <view v-if="pickedTicketId == null && list.length > 0" class="tip-bar">
        优惠券需凭票根使用，请先选择票根
      </view>

      <view v-if="loading && list.length === 0" class="state-text">加载中...</view>

      <template v-else-if="list.length > 0">
        <view
          v-for="c in list"
          :key="c.id"
          class="coupon-card"
          :class="['t' + (Number(c.coupon_type) || 1), isUsable(c) ? '' : 'disabled', isPicked(c) ? 'picked' : '']"
          @click="onPick(c)"
        >
          <!-- 左侧：面额主视觉（按券种变色） -->
          <view class="cp-left">
            <text class="cp-tag">{{ typeText(c.coupon_type) }}</text>
            <text class="cp-amount">{{ amountPart(c) }}</text>
            <text class="cp-sub">{{ amountSub(c) }}</text>
          </view>

          <!-- 右侧：详情 -->
          <view class="cp-right">
            <text class="cp-title">{{ c.title }}</text>

            <view class="cp-cats">
              <text class="cats-label">适用业态</text>
              <template v-if="catsArr(c.categories).length">
                <text v-for="tag in catsArr(c.categories)" :key="tag" class="cp-chip">{{ tag }}</text>
              </template>
              <text v-else class="cp-chip">不限</text>
            </view>

            <view class="cp-valid">
              <text class="dot"></text>
              <text>有效期 {{ dateText(c.starttime) }} 至 {{ dateText(c.endtime) }}</text>
            </view>
          </view>

          <!-- 最右：勾选圈（可用券可勾选；灰色券显示空圈不可选） -->
          <view class="cp-check">
            <view v-if="isUsable(c)" class="check-circle" :class="{ on: isPicked(c) }">
              <text v-if="isPicked(c)" class="check-mark">✓</text>
            </view>
            <view v-else class="check-circle off"></view>
          </view>
        </view>

        <view class="load-more">
          <text v-if="loading">加载中...</text>
          <text v-else-if="finished">— 没有更多了 —</text>
        </view>
      </template>

      <view v-else-if="!loading" class="state-text">该店铺暂无优惠券</view>
    </auto-scroll>

    <!-- 底部结算栏：点击后先选支付方式，再按该方式创建订单 -->
    <view class="pay-bar">
      <view class="pay-info">
        <view class="pay-row">
          <text class="pay-label">实付金额</text>
          <text class="pay-amount">¥{{ payAmount }}</text>
        </view>
        <text class="pay-saved">{{ pickedCoupon ? `已选优惠券 · 已优惠${savedAmount}元` : '已优惠0元' }}</text>
      </view>
      <button class="pay-btn" :disabled="submitting" @click="onPay">立即支付</button>
    </view>

    <!-- 选择票根弹层（容器复用通用 sheet-popup） -->
    <sheet-popup :visible="ticketSheet.visible" title="选择票根" @close="closeTicketSheet">
      <scroll-view class="sheet-body" scroll-y>
          <view v-if="ticketSheet.loading" class="state-text">加载中...</view>

          <template v-else-if="ticketList.length > 0">
            <view
              v-for="t in ticketList"
              :key="t.id"
              class="sheet-item"
              :class="{ active: pickedTicketId === t.id }"
              @click="chooseTicket(t)"
            >
              <image class="sheet-ticket-img" :src="t.user_image_url || ''" mode="aspectFill" />
              <view class="sheet-info">
                <text class="sheet-name">{{ t.title || '未知票根' }}</text>
                <text v-if="t.ticket_category || t.ticket_sn" class="sheet-meta">
                  {{ t.ticket_category || '' }}{{ t.ticket_category && t.ticket_sn ? ' · ' : '' }}{{ t.ticket_sn || '' }}
                </text>
              </view>
              <view class="check-circle" :class="{ on: pickedTicketId === t.id }">
                <text v-if="pickedTicketId === t.id" class="check-mark">✓</text>
              </view>
            </view>
          </template>

          <!-- 无票根：给出识别入口，不用跳出当前买单流程 -->
          <view v-else class="tk-empty">
            <text class="tk-empty-text">暂无可用票根</text>
            <button class="tk-upload-btn" :disabled="ticketUploading" @click="uploadTicket">
              {{ ticketUploading ? '识别中...' : '📷 上传 / 识别票根' }}
            </button>
            <text class="tk-empty-tip">拍照或相册选图，识别通过后可在此选择使用</text>
          </view>
      </scroll-view>
    </sheet-popup>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getShopCoupons } from '@/api/shop.js'
import { getUserTicketList } from '@/api/user.js'
import { createOrder } from '@/api/order.js'
import { usePageList } from '@/utils/usePageList.js'
import AutoScroll from '@/components/auto-scroll/auto-scroll.vue'
import SheetPopup from '@/components/sheet-popup/sheet-popup.vue'
import { uploadAndVerifyTicket } from '@/api/ticket.js'
import { compressImage } from '@/utils/compressImage.js'
import { useSubmit } from '@/utils/submitGuard.js' // 统一防重复提交

const CAT_MAP = {
  1: '景区',
  2: '住宿',
  3: '餐饮',
  4: '文创零售',
  5: '交通服务',
  6: '演出展览'
}
const TYPE_MAP = {
  1: '满减券',
  2: '折扣券',
  3: '首道门票折扣',
  4: '专属票价'
}

const shopId = ref(null)
const shopName = ref('')
const amountInput = ref('')
const listRefreshing = ref(false)
const scrollRef = ref(null)



// ===== 票根选择 =====
const pickedTicketId = ref(null)
const ticketList = ref([])
const ticketSheet = ref({ visible: false, loading: false })

const pickedTicket = computed(
  () => ticketList.value.find((t) => String(t.id) === String(pickedTicketId.value)) || null
)

// 拉取我的票根（只保留未兑换的可用票根），供弹层与识别成功后复用
async function fetchTicketList() {
  ticketList.value = []
  try {
    const res = await getUserTicketList({ page: 1, limit: 100 })
    const data = res && res.data
    const arr = (Array.isArray(data) ? data : data && Array.isArray(data.list) ? data.list : []) || []
    ticketList.value = arr.filter((t) => !(t.exchange_status > 0 || !!t.exchanged_at || t.coupon_id > 0))
    // 已选票根不在本次列表时清掉，避免回显残留
    if (pickedTicketId.value != null && !ticketList.value.some((t) => String(t.id) === String(pickedTicketId.value))) {
      pickedTicketId.value = null
    }
  } catch (e) {
    console.error('票根列表加载异常:', e)
    ticketList.value = []
  }
}

async function openTicketPicker() {
  if (ticketSheet.value.visible) return
  ticketSheet.value.visible = true
  ticketSheet.value.loading = true
  await fetchTicketList()
  ticketSheet.value.loading = false
}

// 没有票根时直接调起识别：与首页同一套 uploadAndVerifyTicket，成功后刷新列表
const ticketUploading = ref(false)
async function uploadTicket() {
  if (ticketUploading.value) return
  if (!uni.getStorageSync('pgtoken')) {
    uni.showToast({ title: '请先登录后再识别票根', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    fail: () => {},
    success: async (chooseRes) => {
      ticketUploading.value = true
      uni.showLoading({ title: '识别中...', mask: true })
      try {
        const file = await compressImage(chooseRes.tempFilePaths[0])
        const res = await uploadAndVerifyTicket(file, {})
        const ocr = (res && res.data && res.data.ocr_result) || {}
        if (ocr.is_valid === true) {
          uni.showToast({ title: '票根识别成功', icon: 'success' })
          // 重新拉取，让新票根出现在选择列表中
          ticketSheet.value.loading = true
          await fetchTicketList()
        } else {
          uni.showToast({
            title: ocr.reject_reason || '票根核验未通过',
            icon: 'none',
            duration: 2500
          })
        }
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '票根识别失败，请重试', icon: 'none' })
      } finally {
        uni.hideLoading()
        ticketSheet.value.loading = false
        ticketUploading.value = false
      }
    }
  })
}

function chooseTicket(t) {
  pickedTicketId.value = t.id
  closeTicketSheet()
}

function closeTicketSheet() {
  ticketSheet.value.visible = false
}

// 传入 shop_id 拉取该商家券
const { list, total, loading, finished, refresh, loadMore } = usePageList((p) =>
  getShopCoupons({ shop_id: shopId.value, page: p.page, limit: p.limit })
)

// 列表数据变化后重新测量“是否排满、可否滚动”
watch(list, async () => {
  await nextTick()
  if (scrollRef.value && scrollRef.value.sync) scrollRef.value.sync()
})

// 满减/折扣券（适用消费总额买单）：必须已选票根 + 金额达到门槛才点亮，否则置灰。
// 优惠券是票根权益，没有票根时只能按原价支付，不能使用优惠券。
// 门票类(3/4)不适用消费总额场景，始终置灰不可选。
function isUsable(c) {
  if (!isPickable(c)) return false
  // 未选择票根 → 所有优惠券不可选
  if (pickedTicketId.value == null) return false
  const amt = Number(amountInput.value)
  if (!amt || amt <= 0) return false
  const min = Number(c.min_point || 0)
  return amt >= min
}

// 只允许消费总额场景使用的券参与勾选（满减/折扣）
function isPickable(c) {
  const t = Number(c.coupon_type)
  return t === 1 || t === 2
}

// ===== 优惠券单选 =====
const pickedId = ref(null)

const pickedCoupon = computed(() => list.value.find((x) => String(x.id) === String(pickedId.value)) || null)

function isPicked(c) {
  return pickedId.value != null && String(c.id) === String(pickedId.value)
}

function onPick(c) {
  if (!isUsable(c)) return
  pickedId.value = isPicked(c) ? null : c.id
}

// 金额变化后，若已选券不再满足门槛则自动取消勾选
watch(amountInput, () => {
  if (pickedId.value != null && pickedCoupon.value && !isUsable(pickedCoupon.value)) pickedId.value = null
})

// 取消票根后优惠券失去使用资格，自动取消已选券
watch(pickedTicketId, (v) => {
  if (v == null && pickedId.value != null) pickedId.value = null
})
// 列表刷新后若已选券已不存在则清除选中
watch(list, (val) => {
  if (pickedId.value != null && !val.some((x) => String(x.id) === String(pickedId.value))) pickedId.value = null
})

// 消费总额
const totalMoney = computed(() => {
  const a = Number(amountInput.value)
  return a > 0 ? money(a) : 0
})

// 单张券在当前总额下可抵的优惠：满减按面额；折扣按折率折算
function discountOf(c) {
  if (!c) return 0
  const total = totalMoney.value
  const t = Number(c.coupon_type)
  if (t === 1) return Math.min(money(c.discount_amount), total)
  if (t === 2) {
    const d = Number(c.discount_amount) || 0
    const rate = d >= 1 ? Math.min(d, 10) / 10 : d // 存8→8折(0.8)、存0.88→0.88折率
    if (!(rate > 0 && rate < 1)) return 0
    return money(total * (1 - rate))
  }
  return 0
}

const savedAmount = computed(() => discountOf(pickedCoupon.value))
// 实付 = 总额 - 已选券优惠，最低 0
const payAmount = computed(() => Math.max(0, money(totalMoney.value - savedAmount.value)))

// 创建订单 → 跳转收银台（在线支付 / 到店付现在收银台选择）
async function createPayOrder() {
  // ticket_id/coupon_id 均非必选：不选券、不选票根也能按原价购买
  // pay_type 不在这里传：支付方式由收银台选定后回传后端
  const params = {
    shop_id: Number(shopId.value),
    amount: payAmount.value,
    discount_amount: savedAmount.value,
    payable_amount: payAmount.value
  }
  if (pickedId.value != null) params.coupon_id = Number(pickedId.value)
  if (pickedTicketId.value != null) params.ticket_id = Number(pickedTicketId.value)

  const res = await createOrder(params)
  if (!res) return // 失败已由 request.js 统一提示

  // 后端返回 { coupon, order, ticket }，订单主体在 data.order 里；同时兼容订单字段直接平铺的情况
  const data = res.data || {}
  const order = data.order || data
  const orderId = order.id ?? order.order_id
  const orderNo = order.order_no || order.orderNo || ''

  if (!orderId) {
    uni.showToast({ title: '订单创建异常，请重试', icon: 'none' })
    return
  }

  // 当前页出栈，交给收银台完成支付；返回时不会回到已提交的买单页
  uni.redirectTo({
    url:
      '/pages/users/pay/pay?order_id=' + orderId +
      '&order_no=' + encodeURIComponent(orderNo) +
      '&amount=' + payAmount.value +
      '&total=' + totalMoney.value +
      '&discount=' + savedAmount.value +
      '&shop_name=' + encodeURIComponent(shopName.value || '')
  })
}

// 统一防重复提交：submitting 绑定到按钮 :disabled
const { loading: submitting, submit: doPay } = useSubmit(createPayOrder, { cooldown: 1000 })

// 立即支付入口：校验置于锁外，失败不占用冷却
function onPay() {
  if (totalMoney.value <= 0) {
    uni.showToast({ title: '请先输入消费金额', icon: 'none' })
    return
  }
  doPay()
}

function safeDecode(s) {
  if (!s) return ''
  try {
    return decodeURIComponent(s)
  } catch (e) {
    return s
  }
}

onLoad((query) => {
  shopId.value = Number(query && query.shop_id)
  shopName.value = (query && query.name) ? safeDecode(query.name) : ''
  refresh()
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

function typeText(type) {
  return TYPE_MAP[Number(type)] || '优惠券'
}

// 单个分类值 → 名称：只认 1~6
function labelOf(item) {
  if (item == null) return ''
  if (typeof item === 'object') {
    if (item.id != null && CAT_MAP[Number(item.id)]) return CAT_MAP[Number(item.id)]
    return ''
  }
  const t = String(item).trim()
  return CAT_MAP[Number(t)] || ''
}

function catsArr(v) {
  if (v == null || v === '') return []
  let items
  if (Array.isArray(v)) {
    items = v
  } else if (typeof v === 'object') {
    items = Object.values(v)
  } else {
    items = String(v).split(/[,，、;；\s]+/)
  }
  const names = []
  items.forEach((it) => {
    const name = labelOf(it)
    if (name && !names.includes(name)) names.push(name)
  })
  return names
}

function money(v) {
  return Number(Number(v || 0).toFixed(2))
}

function amountPart(c) {
  const type = Number(c.coupon_type)
  const amt = money(c.discount_amount)
  if (type === 1 || type === 4) return amt > 0 ? `¥${amt}` : ''
  if (type === 2 || type === 3) {
    const fold = foldText(amt)
    return fold ? `${fold}折` : ''
  }
  return amt > 0 ? `¥${amt}` : ''
}

function amountSub(c) {
  const type = Number(c.coupon_type)
  const min = money(c.min_point)
  if (type === 1) return min > 0 ? `满 ¥${min} 可用` : '无门槛立减'
  if (type === 2) return '全场通用'
  if (type === 3) return '首道门票'
  if (type === 4) return '专属票价'
  return ''
}

function dateText(s) {
  return s ? String(s).slice(0, 10) : '-'
}

function foldText(v) {
  const n = Number(v) || 0
  const raw = n >= 1 ? n : n * 10
  const out = Math.round(raw * 10) / 10
  return Number.isInteger(out) ? String(out) : String(out)
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

.amount-card {
  flex-shrink: 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .amount-shop {
    display: block;
    font-size: 30rpx;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 22rpx;
  }

  .amount-box {
    background: #f8fafc;
    border-radius: 16rpx;
    padding: 26rpx 28rpx 18rpx;
  }

  .amount-head {
    display: flex;
    align-items: baseline;
  }

  .amount-title {
    font-size: 34rpx;
    font-weight: 800;
    color: #0f172a;
    margin-right: 16rpx;
  }

  .amount-hint {
    font-size: 24rpx;
    color: #94a3b8;
  }

  .amount-input {
    height: 100rpx;
    width: 100%;
    box-sizing: border-box;
    margin-top: 20rpx;
    padding: 12rpx 0 22rpx;
    text-align: center;
    font-size: 44rpx;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 1rpx solid #e2e8f0;
  }
}

.state-text {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding: 120rpx 0;
}

/* 票根弹层空态：含识别入口 */
.tk-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0 40rpx;

  .tk-empty-text {
    font-size: 26rpx;
    color: #94a3b8;
  }

  .tk-upload-btn {
    margin-top: 28rpx;
    height: 76rpx;
    line-height: 76rpx;
    padding: 0 40rpx;
    border-radius: 999rpx;
    background: linear-gradient(90deg, #2563eb, #1d4ed8);
    color: #fff;
    font-size: 28rpx;
    font-weight: 800;
    border: none;

    &::after {
      border: none;
    }

    &[disabled] {
      background: #94a3b8;
    }
  }

  .tk-empty-tip {
    margin-top: 18rpx;
    font-size: 22rpx;
    color: #cbd5e1;
  }
}

/* 未选票根提示条 */
.tip-bar {
  margin-bottom: 20rpx;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  background: #fff7ed;
  border: 1rpx solid #fed7aa;
  color: #b45309;
  font-size: 24rpx;
  line-height: 1.5;
}

/* ===== 使用票根选择行 ===== */
.ticket-card {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .ticket-label {
    flex: 1;
    .ticket-title {
      display: block;
      font-size: 30rpx;
      font-weight: 800;
      color: #0f172a;
    }
    .ticket-hint {
      display: block;
      margin-top: 6rpx;
      font-size: 22rpx;
      color: #94a3b8;
    }
  }

  .ticket-value {
    display: flex;
    align-items: center;
    max-width: 60%;

    .ticket-name {
      font-size: 26rpx;
      font-weight: 700;
      color: #2563eb;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      max-width: 260rpx;
    }

    .ticket-status {
      flex-shrink: 0;
      margin-left: 12rpx;
      font-size: 20rpx;
      color: #15803d;
      background: #dcfce7;
      border-radius: 999rpx;
      padding: 4rpx 14rpx;
      font-weight: 700;
    }

    .ticket-placeholder {
      font-size: 28rpx;
      color: #94a3b8;
    }

    .ticket-arrow {
      margin-left: 10rpx;
      font-size: 30rpx;
      color: #cbd5e1;
    }
  }
}

/* ===== 选择票根底部弹层 ===== */
/* 弹层容器已统一为 components/sheet-popup，此处仅保留弹层内部列表样式 */
.sheet-body {
  height: 60vh;
  box-sizing: border-box;
  padding: 0 4rpx 20rpx;

  .sheet-item {
      display: flex;
      align-items: center;
      background: #fff;
      border: 2rpx solid #e2e8f0;
      border-radius: 20rpx;
      padding: 20rpx;
      margin-bottom: 20rpx;

      &.active {
        border-color: #2563eb;
        background: #eff6ff;
      }

      .sheet-ticket-img {
        width: 96rpx;
        height: 120rpx;
        border-radius: 10rpx;
        background: #e2e8f0;
        flex-shrink: 0;
      }

      .sheet-info {
        flex: 1;
        min-width: 0;
        margin: 0 20rpx;
        display: flex;
        flex-direction: column;

        .sheet-name {
          font-size: 28rpx;
          font-weight: 800;
          color: #0f172a;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
        }

        .sheet-meta {
          margin-top: 8rpx;
          font-size: 22rpx;
          color: #64748b;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      }
    }
}

/* ===== 票据式券卡 ===== */
.coupon-card {
  position: relative;
  display: flex;
  background: #fff;
  border-radius: 22rpx;
  overflow: hidden;
  margin-bottom: 22rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.06);

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 246rpx;
    width: 26rpx;
    height: 26rpx;
    background: #f1f5f9;
    border-radius: 50%;
    z-index: 2;
  }
  &::before { top: -13rpx; }
  &::after { bottom: -13rpx; }

  &.t1 .cp-left { background: linear-gradient(140deg, #ff7a59 0%, #ff3d5e 100%); }
  &.t2 .cp-left { background: linear-gradient(140deg, #38a0ff 0%, #4f6bff 100%); }
  &.t3 .cp-left { background: linear-gradient(140deg, #23d3a3 0%, #0ea5a5 100%); }
  &.t4 .cp-left { background: linear-gradient(140deg, #a78bfa 0%, #7c3aed 100%); }

  .cp-left {
    width: 260rpx;
    flex-shrink: 0;
    box-sizing: border-box;
    padding: 36rpx 16rpx 44rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;

    .cp-tag {
      font-size: 20rpx;
      letter-spacing: 2rpx;
      opacity: 0.9;
      background: rgba(255, 255, 255, 0.22);
      border-radius: 6rpx;
      padding: 4rpx 14rpx;
    }

    .cp-amount {
      margin-top: 18rpx;
      font-size: 56rpx;
      font-weight: 900;
      line-height: 1.1;
      text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.12);
    }

    .cp-sub {
      margin-top: 12rpx;
      font-size: 22rpx;
      opacity: 0.92;
    }
  }

  .cp-right {
    flex: 1;
    min-width: 0;
    padding: 30rpx 26rpx 26rpx 34rpx;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .cp-title {
      font-size: 30rpx;
      font-weight: 800;
      color: #0f172a;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }

    .cp-cats {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 18rpx;

      .cats-label {
        font-size: 20rpx;
        color: #94a3b8;
        margin-right: 12rpx;
      }

      .cp-chip {
        font-size: 20rpx;
        color: #475569;
        background: #f1f5f9;
        border-radius: 6rpx;
        padding: 4rpx 12rpx;
        margin-right: 12rpx;
        margin-bottom: 8rpx;
      }
    }

    .cp-valid {
      display: flex;
      align-items: center;
      margin-top: 16rpx;
      padding-top: 18rpx;
      border-top: 1rpx dashed #e2e8f0;
      font-size: 22rpx;
      color: #94a3b8;

      .dot {
        width: 10rpx;
        height: 10rpx;
        border-radius: 50%;
        background: #f59e0b;
        margin-right: 10rpx;
      }
    }
  }
}

/* 不满足门槛：整卡置灰（放在 t1~t4 渐变规则之后以覆盖） */
.coupon-card.disabled {
  box-shadow: none;

  .cp-left { background: #cbd5e1; }
  .cp-title { color: #94a3b8; }
  .cp-chip { color: #94a3b8; background: #f1f5f9; }
  .cp-valid .dot { background: #cbd5e1; }
}



/* 券卡右侧勾选圈 */
.coupon-card {
  .cp-check {
    flex-shrink: 0;
    width: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-right: 16rpx;
  }
}

/* 通用勾选圈（券卡 + 票根弹层共用） */
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

  &.off {
    border-color: #e2e8f0;
    background: #f8fafc;
  }

  .check-mark {
    color: #fff;
    font-size: 24rpx;
    font-weight: 900;
    line-height: 1;
  }
}

.load-more {
  text-align: center;
  padding: 24rpx 0 40rpx;
  font-size: 24rpx;
  color: #94a3b8;
}

/* ===== 底部结算栏 ===== */
.pay-bar {
  flex-shrink: 0;
  /* 负外边距抵消页面 padding，通栏贴底 */
  margin: 0 -24rpx -24rpx;
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

    .pay-saved {
      display: block;
      margin-top: 6rpx;
      font-size: 24rpx;
      color: #ff2d55;
    }
  }

  .pay-btn {
    margin: 0;
    width: 240rpx;
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
  }
}
</style>
