<template>
  <view class="page">
    <scroll-view class="scroll" scroll-y>
      <!-- 封面轮播 -->
      <swiper
        v-if="covers.length"
        class="cover"
        circular
        indicator-dots
        :indicator-color="'rgba(255,255,255,0.4)'"
        :indicator-active-color="'#ffffff'"
      >
        <swiper-item v-for="(url, i) in covers" :key="i" @click="previewCover(i)">
          <image class="cover-img" :src="url" mode="aspectFill" />
        </swiper-item>
      </swiper>
      <view v-else class="cover cover-empty"></view>

      <view v-if="loading" class="state-tip">加载中...</view>

      <template v-else-if="product">
        <!-- 主信息卡 -->
        <view class="main-card">
          <text class="title">{{ product.title || '团购商品' }}</text>
          <text v-if="product.sub_title" class="sub-title">{{ product.sub_title }}</text>

          <view class="price-row">
            <view class="price-main">
              <text class="p-symbol">¥</text>
              <text class="p-num">{{ money(displayPrice) }}</text>
            </view>
            <text v-if="showOriginal" class="p-orig">¥{{ money(currentOriginal) }}</text>
            <text class="p-sales">已售 {{ product.sales_count || 0 }}</text>
          </view>

          <view v-if="validText" class="tag-row">
            <text class="tag">{{ validText }}</text>
          </view>
        </view>

        <!-- 选择日期（日历价 / 动态库存）：一行摘要，点击弹层 -->
        <view v-if="showCalendar" class="card cal-bar" @click="openCal">
          <text class="cal-bar-label">{{ calendarMode === 'range' ? '入住' : '使用日期' }}</text>
          <view class="cal-bar-main">
            <text class="cal-bar-date">{{ rangeText || selectedDate || '请选择' }}</text>
            <text v-if="calendarMode === 'range' && rangeDetail" class="cal-bar-sub">共 {{ rangeDetail.count }} 晚 · ¥{{ money(rangeDetail.total) }}</text>
          </view>
          <text class="cal-bar-arrow">›</text>
        </view>

        <!-- 规格选择 -->
        <view v-if="skus.length" class="card">
          <text class="card-title">选择规格</text>
          <view
            v-for="(s, i) in skus"
            :key="s.id || i"
            class="sku-item"
            :class="{ on: selectedSkuIndex === i, sold: Number(s.stock) <= 0 }"
            @click="pickSku(i)"
          >
            <view class="sku-main">
              <text class="sku-name">{{ s.sku_name || `规格 ${i + 1}` }}</text>
              <text class="sku-stock">{{ Number(s.stock) > 0 ? `剩 ${s.stock}` : '已售罄' }}</text>
            </view>
            <text class="sku-price">¥{{ money(s.price) }}</text>
          </view>
        </view>

        <!-- 购买数量 -->
        <view class="card">
          <view class="qty-row">
            <text class="card-title no-mb">购买数量</text>
            <view class="stepper">
              <text class="step-btn" :class="{ dis: quantity <= 1 }" @click="decQty">−</text>
              <text class="step-num">{{ quantity }}</text>
              <text class="step-btn" :class="{ dis: quantity >= maxQty }" @click="incQty">＋</text>
            </view>
          </view>
          <text v-if="limitText" class="qty-tip">{{ limitText }}</text>
        </view>

        <!-- 套餐明细 -->
        <view v-if="itemGroups.length" class="card">
          <text class="card-title">套餐明细</text>
          <view v-for="g in itemGroups" :key="g.name" class="item-group">
            <text class="group-name">{{ g.name }}</text>
            <view v-for="(it, i) in g.list" :key="i" class="item-row">
              <text class="item-name">{{ it.item_name }}</text>
              <text class="item-qty">{{ it.quantity }}{{ it.unit || '' }}</text>
            </view>
          </view>
        </view>

        <!-- 购买须知 -->
        <view v-if="rule" class="card">
          <text class="card-title">购买须知</text>
          <view v-for="(n, i) in noticeList" :key="i" class="notice-row">
            <text class="notice-dot">·</text>
            <text class="notice-text">{{ n }}</text>
          </view>
        </view>

        <!-- ticket_discount：票根联运优惠，点击选择我的票根 -->
        <view v-if="ticketText" class="card ticket-card" @click="openTicketPicker">
          <text class="ticket-icon">🎫</text>
          <view class="ticket-main">
            <text class="ticket-text">{{ ticketText }}</text>
            <text v-for="(line, i) in ticketDescLines" :key="i" class="ticket-line">{{ line }}</text>
            <text v-if="selectedTicket" class="ticket-picked">
              已选：{{ selectedTicket.title || selectedTicket.ticket_sn || '票根' }} · 减 ¥{{ money(ticketCut) }}
            </text>
            <text v-else class="ticket-pick">点击选择票根 ›</text>
          </view>
        </view>

        <!-- 商家卡片 -->
        <view v-if="shop" class="card shop-card" @click="goShop">
          <image class="shop-logo" :src="shop.logo || ''" mode="aspectFill" />
          <view class="shop-main">
            <text class="shop-name">{{ shop.name || '商家' }}</text>
            <text v-if="shop.address" class="shop-addr">{{ shop.address }}</text>
          </view>
          <text class="shop-arrow">›</text>
        </view>
      </template>

      <view v-else class="state-tip">商品不存在或已下架</view>

      <view class="bottom-gap"></view>
    </scroll-view>

    <!-- 日历弹层（一行摘要点击唤起，可选范围限制在今天起 30 天内） -->
    <sheet-popup
      :visible="showCalPopup"
      :title="calendarMode === 'range' ? '选择入住 / 离店日期' : '选择使用日期'"
      @close="closeCal"
    >
      <goods-calendar
        v-model="selectedDate"
        :mode="calendarMode"
        :calendar="calendarData"
        :sku-id="selectedSku ? Number(selectedSku.id || 0) : 0"
        :fallback-price="basePrice"
        :fallback-stock="baseStock"
        :min-date="todayStr"
        :max-date="maxDateStr"
        :start="range.checkin"
        :end="range.checkout"
        @change="onCalChange"
      />
      <template #foot>
        <button class="cal-confirm" :disabled="!calConfirmable" @click="confirmCal">
          {{ calendarMode === 'range' && rangeDetail ? `确认 ${rangeDetail.count} 晚 · ¥${money(rangeDetail.total)}` : '确认' }}
        </button>
      </template>
    </sheet-popup>

    <!-- 票根选择弹层：列出我的票根，按票种/目的地/时效校验 -->
    <sheet-popup :visible="showTicketPopup" title="选择票根" @close="showTicketPopup = false">
      <scroll-view scroll-y class="tk-scroll">
        <view v-if="ticketLoading" class="tk-state">票根加载中...</view>
        <view v-else-if="!myTickets.length" class="tk-state">暂无票根，去首页上传识别一张吧</view>
        <template v-else>
          <view
            v-for="t in myTickets"
            :key="t.id"
            class="tk-item"
            :class="{ dis: !ticketCheck(t).ok }"
            @click="pickTicket(t)"
          >
            <image class="tk-img" :src="t.user_image_url || ''" mode="aspectFill" />
            <view class="tk-main">
              <text class="tk-title">{{ t.title || '未知票根' }}</text>
              <text class="tk-meta">
                {{ [t.ticket_category, dayText(t.event_date)].filter(Boolean).join(' · ') }}
              </text>
              <text v-if="!ticketCheck(t).ok" class="tk-bad">{{ ticketCheck(t).reason }}</text>
            </view>
            <text v-if="selectedTicket && selectedTicket.id === t.id" class="tk-ok">✓</text>
          </view>
        </template>
      </scroll-view>
      <template #foot>
        <button v-if="selectedTicket" class="cal-confirm" @click="clearTicket">不使用票根</button>
      </template>
    </sheet-popup>

    <!-- 底部购买栏 -->
    <view v-if="product" class="buy-bar">
      <view class="bar-price">
        <text class="bar-label">合计</text>
        <view class="bar-amount">
          <text class="bar-symbol">¥</text>
          <text class="bar-num">{{ money(finalPayable) }}</text>
        </view>
        <text v-if="ticketCut > 0" class="bar-cut">票根减 ¥{{ money(ticketCut) }}</text>
      </view>
      <button class="buy-btn" :disabled="buying || soldOut" @click="onBuy">
        {{ soldOut ? '已售罄' : (buying ? '处理中...' : '立即购买') }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getGoodsDetail } from '@/api/shop.js'
import { createOrder } from '@/api/order.js'
import { getUserTicketList } from '@/api/user.js'
import { useSubmit } from '@/utils/submitGuard.js' // 统一防重复提交
import GoodsCalendar from '@/components/goods-calendar/goods-calendar.vue'
import SheetPopup from '@/components/sheet-popup/sheet-popup.vue'

const goodsId = ref(null)
const loading = ref(true)

const product = ref(null)
const skus = ref([])
const items = ref([])
const rule = ref(null)
const ticketDiscount = ref(null)
const shop = ref(null)

// 选中规格下标（无规格时为 -1，走商品主价）
const selectedSkuIndex = ref(0)
const quantity = ref(1)

// 封面：images 为 JSON 字符串，解析失败降级为逗号分隔；再兜底主图
const covers = computed(() => {
  const p = product.value || {}
  let imgs = []
  if (p.images) {
    try {
      const parsed = JSON.parse(p.images)
      if (Array.isArray(parsed)) imgs = parsed.filter(Boolean)
    } catch (e) {
      imgs = String(p.images).split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  if (!imgs.length && p.cover_image) imgs = [p.cover_image]
  return imgs
})

const selectedSku = computed(() => (skus.value.length ? skus.value[selectedSkuIndex.value] : null))

// ===== 日历价（动态库存 / 配了日历的商品：按日期计价与库存）=====
const calendarData = ref([]) // 公开详情返回的 data.calendar（含停售）
const selectedDate = ref('') // 用户选择的日期 YYYY-MM-DD
const todayStr = fmtDate(new Date()) // 日历最小可选日（今天）

// 是否展示日期选择：仅每日/场次动态库存（StockType=2）商品
const showCalendar = computed(
  () => Number((product.value && product.value.stock_type) || 1) === 2
)

// 是否住宿业态（房晚/住）：需用「入住-离店」区间
const isHotel = computed(() => {
  const p = product.value || {}
  return p.biz_type === 'HOTEL' || p.product_type === 'ROOM_NIGHT'
})
// 日历模式：住宿走区间，其余走单日
const calendarMode = computed(
  () => (showCalendar.value && isHotel.value ? 'range' : 'single')
)
// 可选上界：今天起 30 天（限制翻页到明年后年）
const maxDateStr = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return fmtDate(d)
})
// 区间选择结果（仅展示，下单字段待后端适配）
const range = ref({ checkin: '', checkout: '', nights: 0 })
// 弹层显隐
const showCalPopup = ref(false)
function openCal() {
  showCalPopup.value = true
}
function closeCal() {
  showCalPopup.value = false
}
function onCalChange(p) {
  if (calendarMode.value === 'range') {
    range.value = { checkin: p.checkin || '', checkout: p.checkout || '', nights: p.nights || 0 }
  }
}
const calConfirmable = computed(() => {
  if (calendarMode.value === 'range') {
    const rd = rangeDetail.value
    return !!(rd && rd.allSellable)
  }
  return !!selectedDate.value
})
function confirmCal() {
  if (!calConfirmable.value) return
  // 区间模式：把入住日写入兼容字段，供现有展示/下单使用；完整区间字段待后端适配
  if (calendarMode.value === 'range') selectedDate.value = range.value.checkin
  closeCal()
}
// 摘要行文案（区间显示 入住-离店 / 晚数）
function fmtShort(ds) {
  if (!ds) return ''
  const d = new Date(`${ds}T00:00:00`)
  const wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  const p2 = (n) => String(n).padStart(2, '0')
  return `${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${wk}`
}
const rangeText = computed(() => {
  if (calendarMode.value !== 'range') return ''
  const r = range.value
  if (r.checkin && r.checkout) return `${fmtShort(r.checkin)} 入住 – ${fmtShort(r.checkout)} 离店 · ${r.nights}晚`
  if (r.checkin) return `${fmtShort(r.checkin)} 入住（请选离店日）`
  return ''
})

// 基础价/库存：有规格取规格，否则回落商品主表
const basePrice = computed(() => {
  const s = selectedSku.value
  if (s && s.price != null) return Number(s.price)
  return Number((product.value && product.value.selling_price) || 0)
})
const baseStock = computed(() => {
  const s = selectedSku.value
  const v = s && s.stock != null ? s.stock : product.value && product.value.total_stock
  return Number(v || 0)
})

// 按日期查单晚价/库存/可售（复用：单日选中 & 区间逐晚累加）
function lookupDay(ds) {
  if (!ds) return null
  const skuId = selectedSku.value ? Number(selectedSku.value.id || 0) : 0
  const hit = calendarData.value.find(
    (c) => Number(c.sku_id || 0) === skuId && String(c.date || '').slice(0, 10) === ds
  )
  if (hit) {
    const stock = Number(hit.stock || 0)
    return {
      price: Number(hit.price != null ? hit.price : basePrice.value),
      stock,
      sellable: Number(hit.status) === 1 && stock > 0
    }
  }
  return { price: basePrice.value, stock: baseStock.value, sellable: baseStock.value > 0 }
}

// 选中日期命中的日历记录（单日模式）
const selectedDay = computed(() => (selectedDate.value ? lookupDay(selectedDate.value) : null))

// 区间（住宿）逐晚明细：累加每晚价 = 总价；任一晚不可售 → 整段不可订
const rangeDetail = computed(() => {
  const r = range.value
  if (calendarMode.value !== 'range' || !r.checkin || !r.checkout) return null
  const nights = []
  let d = new Date(`${r.checkin}T00:00:00`)
  const end = new Date(`${r.checkout}T00:00:00`)
  while (d < end) {
    const ds = fmtDate(d)
    nights.push({ date: ds, ...lookupDay(ds) })
    d.setDate(d.getDate() + 1)
  }
  const total = nights.reduce((s, n) => s + (n.price || 0), 0)
  const allSellable = nights.length > 0 && nights.every((n) => n.sellable)
  return { nights, total, allSellable, count: nights.length }
})

// 主展示价：区间模式显示「总价」，单日模式显示单日价
const displayPrice = computed(() =>
  calendarMode.value === 'range' && rangeDetail.value ? rangeDetail.value.total : currentPrice.value
)

// 当前价/划线价/库存：选了日期按日历，否则按主表
const currentPrice = computed(() =>
  showCalendar.value && selectedDay.value ? selectedDay.value.price : basePrice.value
)
const currentOriginal = computed(() => {
  const s = selectedSku.value
  if (s && s.original_price != null) return Number(s.original_price)
  return Number((product.value && product.value.original_price) || 0)
})
const showOriginal = computed(
  () => calendarMode.value !== 'range' && currentOriginal.value > currentPrice.value
)
const currentStock = computed(() =>
  showCalendar.value && selectedDay.value ? selectedDay.value.stock : baseStock.value
)
const soldOut = computed(() => {
  if (calendarMode.value === 'range') return rangeDetail.value ? !rangeDetail.value.allSellable : false
  return currentStock.value <= 0
})

// 最大可购数量：受单次限购 / 每人限购 / 库存共同约束
const maxQty = computed(() => {
  const r = rule.value || {}
  const limits = []
  if (Number(r.limit_per_order) > 0) limits.push(Number(r.limit_per_order))
  if (Number(r.limit_per_user) > 0) limits.push(Number(r.limit_per_user))
  if (currentStock.value > 0) limits.push(currentStock.value)
  return limits.length ? Math.max(1, Math.min.apply(null, limits)) : 999
})

const payable = computed(() => Number((displayPrice.value * quantity.value).toFixed(2)))

// 明细按 group_name 分组渲染
const itemGroups = computed(() => {
  const map = new Map()
  for (const it of items.value) {
    const g = it.group_name || '其他'
    if (!map.has(g)) map.set(g, [])
    map.get(g).push(it)
  }
  return Array.from(map.entries()).map(([name, list]) => ({ name, list }))
})

const validText = computed(() => {
  const p = product.value || {}
  if (Number(p.valid_type) === 2 && Number(p.valid_days) > 0) return `购买后 ${p.valid_days} 天内有效`
  const s = dayText(p.valid_start)
  const e = dayText(p.valid_end)
  if (s && e) return `${s} 至 ${e}`
  return ''
})

// 购买须知：由 rule + use_instructions 组装
const noticeList = computed(() => {
  const r = rule.value || {}
  const list = []
  if (Number(r.need_appointment) === 1) {
    const h = Number(r.appointment_advance_hours || 0)
    list.push(h > 0 ? `需提前 ${h} 小时预约` : '需提前预约')
  } else if (Number(r.need_appointment) === 2) {
    list.push('需指定场次/日期使用')
  }
  if (Number(r.need_real_name) === 1) list.push('需实名出行，下单请填写出行人信息')
  if (r.appointment_phone) list.push(`预约/咨询电话：${r.appointment_phone}`)
  list.push(refundText(r.refund_rule))
  for (const u of parseList(r.use_instructions)) list.push(u)
  return list
})

const limitText = computed(() => {
  const r = rule.value || {}
  const arr = []
  if (Number(r.limit_per_user) > 0) arr.push(`每人限购 ${r.limit_per_user} 张`)
  if (Number(r.limit_per_order) > 0) arr.push(`单次限用 ${r.limit_per_order} 张`)
  return arr.join(' · ')
})

// ===== 票根联运优惠 =====
// 商家配置字段（见 /shop/goods/detail 的 ticket_discount）：
//   is_enabled             是否开启（0 关闭时不展示任何票根优惠）
//   allow_ticket_categories 支持票种，逗号分隔，如「火车票,飞机票」
//   match_destination_city  限定到达城市，如「海南」
//   discount_type           1=立减(元) 2=折扣率(0.85=85折)
//   discount_value          立减金额或折扣率
//   ticket_valid_days       票根时效（天）：行程日起 N 天内有效
const ticketOn = computed(() => Number((ticketDiscount.value || {}).is_enabled) === 1)

const ticketText = computed(() => {
  const t = ticketDiscount.value
  if (!ticketOn.value) return ''
  const cats = t.allow_ticket_categories ? `（${t.allow_ticket_categories}）` : ''
  const off =
    Number(t.discount_type) === 2
      ? `${money(Number(t.discount_value) * 10)} 折`
      : `立减 ¥${money(t.discount_value)}`
  // 首行只展示优惠描述；目的地与时效由 ticketDescLines 逐行展示
  return `凭票根享${cats}${off}`
})

// 第二行起：目的地 / 票根时效（逐行展示）
const ticketDescLines = computed(() => {
  const t = ticketDiscount.value
  if (!ticketOn.value) return []
  const lines = []
  if (t.match_destination_city) lines.push(`目的地 ${t.match_destination_city}`)
  if (Number(t.ticket_valid_days) > 0) lines.push(`票根 ${t.ticket_valid_days} 天内有效`)
  return lines
})

// 票根是否满足本商品的联运条件（票种 / 目的地 / 时效）
function ticketCheck(t) {
  const d = ticketDiscount.value || {}
  // 1) 票种：allow_ticket_categories 逗号分隔，模糊包含即通过
  const cats = String(d.allow_ticket_categories || '')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (cats.length) {
    const c = String(t.ticket_category || '').trim()
    // ⚠️ 票种为空时必须判为不匹配：否则 x.includes('') 恒为 true，空票种会被误放行
    if (!c || !cats.some((x) => c.includes(x) || x.includes(c))) {
      return { ok: false, reason: c ? `仅限 ${cats.join(' / ')}` : '票种未知，无法核验' }
    }
  }
  // 2) 目的地：仅当票根数据里存在目的地字段时才校验，没有该字段则不做限制
  const dest = String(d.match_destination_city || '').trim()
  if (dest) {
    const td = String(
      t.destination || t.to_city || t.arrive_city || t.end_city || t.city || ''
    )
    if (td && !td.includes(dest) && !dest.includes(td)) {
      return { ok: false, reason: `需到达 ${dest}` }
    }
  }
  // 3) 时效：行程日距今超过 ticket_valid_days 天则失效
  const days = Number(d.ticket_valid_days || 0)
  if (days > 0 && t.event_date) {
    const at = new Date(String(t.event_date).replace(' ', 'T')).getTime()
    if (!isNaN(at)) {
      const diffDays = Math.floor((Date.now() - at) / 86400000)
      if (diffDays > days) return { ok: false, reason: `超过 ${days} 天时效` }
    }
  }
  return { ok: true, reason: '' }
}

const showTicketPopup = ref(false)
const myTickets = ref([])
const ticketLoading = ref(false)
const selectedTicket = ref(null)

function pickList(res) {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.list)) return res.data.list
  return []
}

async function openTicketPicker() {
  if (!uni.getStorageSync('pgtoken')) {
    uni.showToast({ title: '请先登录后再选票根', icon: 'none' })
    return
  }
  showTicketPopup.value = true
  ticketLoading.value = true
  try {
    const res = await getUserTicketList({ page: 1, limit: 50 })
    myTickets.value = pickList(res)
  } catch (e) {
    console.error('票根列表加载异常:', e)
    myTickets.value = []
  } finally {
    ticketLoading.value = false
  }
}

function pickTicket(t) {
  const r = ticketCheck(t)
  if (!r.ok) {
    uni.showToast({ title: r.reason, icon: 'none' })
    return
  }
  selectedTicket.value = t
  showTicketPopup.value = false
}

function clearTicket() {
  selectedTicket.value = null
  showTicketPopup.value = false
}

// 选中票根后的优惠金额（未选则为 0）
const ticketCut = computed(() => {
  if (!ticketOn.value || !selectedTicket.value) return 0
  const d = ticketDiscount.value
  const base = Number(payable.value)
  if (Number(d.discount_type) === 2) {
    // 折扣率：0.85 表示支付 85%，即优惠 15%
    const rate = Number(d.discount_value || 0)
    return Number(Math.max(0, base * (1 - rate)).toFixed(2))
  }
  return Number(Math.min(base, Number(d.discount_value || 0)).toFixed(2))
})

// 票根优惠后的实付金额
const finalPayable = computed(() => Number(Math.max(0, payable.value - ticketCut.value).toFixed(2)))

function dayText(s) {
  return s ? String(s).slice(0, 10) : ''
}
function money(v) {
  return Number(Number(v || 0).toFixed(2))
}
// 日期格式化 YYYY-MM-DD（日历用）
function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function refundText(v) {
  const map = { 1: '随时退 / 过期自动退', 2: '条件退', 3: '不可退' }
  return map[Number(v)] || '退改规则以商家为准'
}
// use_instructions 为 JSON 字符串数组，解析失败按逗号/换行拆分降级
function parseList(v) {
  if (!v) return []
  try {
    const arr = JSON.parse(v)
    if (Array.isArray(arr)) return arr.filter(Boolean).map(String)
  } catch (e) {
    // 非 JSON，走下方拆分
  }
  return String(v)
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function previewCover(i) {
  const urls = covers.value
  if (!urls.length) return
  uni.previewImage({ current: urls[i] || urls[0], urls })
}

function pickSku(i) {
  if (Number(skus.value[i].stock) <= 0) {
    uni.showToast({ title: '该规格已售罄', icon: 'none' })
    return
  }
  selectedSkuIndex.value = i
  if (quantity.value > maxQty.value) quantity.value = maxQty.value
}
function decQty() {
  if (quantity.value > 1) quantity.value--
}
function incQty() {
  if (quantity.value >= maxQty.value) {
    uni.showToast({ title: '已达可购上限', icon: 'none' })
    return
  }
  quantity.value++
}

function goShop() {
  const s = shop.value || {}
  if (!s.id) return
  uni.navigateTo({
    url: `/pages/shop/detail/detail?shop_id=${s.id}&name=${encodeURIComponent(s.name || '')}&logo=${encodeURIComponent(s.logo || '')}`
  })
}

// ===== 收银台商品快照（纯展示用）=====
// 下单成功后把商品信息暂存到 storage，支付页读取展示明细，支付完成后清除。
// ⚠️ 仅用于展示：实付金额始终以订单返回金额为准，不因快照改变。
// ⚠️ key 需与 pages/users/pay/pay.vue 保持一致。
const PAY_SNAPSHOT_KEY = 'pay_snapshot'
function buildPaySnapshot(orderNo) {
  const p = product.value || {}
  const sku = selectedSku.value
  const originalTotal = Number((currentOriginal.value * quantity.value).toFixed(2))
  const tags = []
  if (validText.value) tags.push(validText.value)
  tags.push(refundText((rule.value || {}).refund_rule))
  const dateText =
    calendarMode.value === 'range'
      ? `${range.value.checkin} 至 ${range.value.checkout}（${range.value.nights}晚）`
      : selectedDate.value || ''
  return {
    order_no: orderNo || '',
    shop_name: (shop.value && shop.value.name) || '',
    goods_title: p.title || '',
    goods_cover: covers.value[0] || p.cover_image || '',
    sku_name: sku ? sku.sku_name || '' : '',
    date_text: dateText,
    tags: tags.filter(Boolean),
    unit_price: Number(displayPrice.value.toFixed(2)),
    original_price: Number(currentOriginal.value.toFixed(2)),
    quantity: quantity.value,
    // 参考价小计与团购优惠（原价 - 团购价）× 数量，仅展示
    original_total: originalTotal,
    group_discount: Number(Math.max(0, originalTotal - payable.value).toFixed(2)),
    // 实付（已减票根优惠），与传给收银台的 amount 保持一致
    payable: Number(finalPayable.value.toFixed(2)),
    // 票根联运减免：让收银台明细与实付金额对得上
    ticket_cut: Number(ticketCut.value.toFixed(2)),
    ticket_title: selectedTicket.value
      ? selectedTicket.value.title || selectedTicket.value.ticket_sn || '票根'
      : '',
    // 快照创建时间：支付页据此判断过期，避免异常退出后残留的旧快照被误用
    created_at: Date.now()
  }
}

// 下单实现（不含锁），由 useSubmit 包装成对外的 buy → onBuy
async function buyImpl() {
  const p = product.value || {}
  const sku = selectedSku.value
  uni.showModal({
    title: '确认购买',
    content: `${p.title || '团购商品'}${
      calendarMode === 'range'
        ? `\n入住 ${range.value.checkin} 离店 ${range.value.checkout}（${range.value.nights}晚）`
        : selectedDate.value ? '\n日期 ' + selectedDate.value : ''
    }\n¥${money(finalPayable.value)} × ${quantity.value}${ticketCut.value > 0 ? `（票根已减 ¥${money(ticketCut.value)}）` : ''}`,
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '下单中...', mask: true })
      // ⚠️ 后端约定：团购流程不使用优惠券时，必须 coupon_id=0 且 discount_amount=0，
      //    接口即按「无优惠全额支付」落库；故 amount 与 payable_amount 均取实付金额。
      //    （参考价与团购差价的展示只在收银台做前端展示，不计入订单优惠字段）
      const productName = [p.title || '', sku ? sku.sku_name || '' : ''].filter(Boolean).join(' ')
      const payload = {
        shop_id: Number(p.shop_id),
        coupon_id: 0,
        product_id: Number(p.id) || 0,
        product_name: productName,
        amount: payable.value,
        // ⚠️ 票根联运：选中票根后把优惠计入 discount_amount。
        //    后端尚未明确票根优惠是否计入 discount_amount，若要求仍传 0，把本行改回 0 即可
        discount_amount: ticketCut.value,
        payable_amount: finalPayable.value,
        // ⚠️ 以下文档未定义，但团购下单必需（规格 / 数量），暂一并透传；待后端补进文档
        sku_id: sku ? Number(sku.id) : 0,
        // 住宿（区间）按「晚数」传：入住-离店几晚就传几，便于后端逐晚扣减每日库存。
        // ⚠️ 注意：这里的 quantity 只作为下单数量字段，实付金额仍由 payable（逐晚价合计 × 份数）计算，不会重复乘
        quantity:
          calendarMode.value === 'range' && Number(range.value.nights) > 0
            ? Number(range.value.nights)
            : quantity.value
      }
      // 选中票根才带 ticket_id（未选则不传，与「团购不使用票根」一致）
      if (selectedTicket.value) payload.ticket_id = Number(selectedTicket.value.id) || 0
      // 日期类字段：仅在实际选择时才传（日历商品的使用日期 / 住宿的入住-离店区间），
      // 未选则不传，避免空串进入后端触发校验
      if (selectedDate.value) payload.use_date = selectedDate.value
      if (range.value.checkin) payload.checkin = range.value.checkin
      if (range.value.checkout) payload.checkout = range.value.checkout
      if (Number(range.value.nights) > 0) payload.nights = Number(range.value.nights)
      const res = await createOrder(payload)
      uni.hideLoading()
      if (!res) return // 失败已由 request.js 统一提示
      const data = res.data || {}
      const order = data.order || data
      const oid = order.id != null ? order.id : order.order_id
      const ono = order.order_no || order.orderNo || ''
      if (!oid) {
        uni.showToast({ title: '下单失败，请重试', icon: 'none' })
        return
      }
      // 暂存商品快照供收银台展示明细（失败不影响支付链路）
      try {
        uni.setStorageSync(PAY_SNAPSHOT_KEY, buildPaySnapshot(ono))
      } catch (e) {
        console.warn('写入支付快照失败:', e)
      }
      uni.redirectTo({
        url:
          '/pages/users/pay/pay?order_id=' + oid +
          '&order_no=' + encodeURIComponent(ono) +
          '&amount=' + finalPayable.value +
          '&total=' + payable.value +
          '&discount=' + ticketCut.value +
          '&shop_name=' + encodeURIComponent((shop.value && shop.value.name) || '')
      })
    }
  })
}

// 统一防重复提交：避免连点弹出多个确认框 / 重复下单
const { loading: buying, submit: buy } = useSubmit(buyImpl, { cooldown: 1200 })

function onBuy() {
  if (!product.value || !product.value.id) {
    uni.showToast({ title: '商品信息加载中', icon: 'none' })
    return
  }
  if (showCalendar.value) {
    if (calendarMode.value === 'range') {
      if (!range.value.checkin || !range.value.checkout) {
        uni.showToast({ title: '请选择入住和离店日期', icon: 'none' })
        return
      }
    } else if (!selectedDate.value) {
      uni.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
  }
  if (soldOut.value) {
    uni.showToast({ title: '该规格已售罄', icon: 'none' })
    return
  }
  buy()
}

async function loadDetail() {
  loading.value = true
  const res = await getGoodsDetail({ id: Number(goodsId.value) })
  loading.value = false
  if (!res || !res.data || !res.data.product) {
    product.value = null
    return
  }
  const d = res.data
  product.value = d.product || null
  skus.value = Array.isArray(d.skus) ? d.skus : []
  items.value = Array.isArray(d.items) ? d.items : []
  rule.value = d.rule || null
  ticketDiscount.value = d.ticket_discount || null
  shop.value = d.shop || null
  calendarData.value = Array.isArray(d.calendar) ? d.calendar : []
  // 默认选中第一个有库存的规格
  if (skus.value.length) {
    const idx = skus.value.findIndex((s) => Number(s.stock) > 0)
    selectedSkuIndex.value = idx > -1 ? idx : 0
  }
  // 需要选日期时，默认选中一个可售日期（今天优先）
  // 区间（住宿）模式：默认「今天入住」，用户再点一天即作为离店日。
  //   此时不能再给 selectedDate 赋值，否则日历会同时高亮「默认日期」和「入住日」两个格子
  if (showCalendar.value) {
    if (calendarMode.value === 'range') range.value.checkin = pickDefaultDate()
    else selectedDate.value = pickDefaultDate()
  }
  if (product.value && product.value.title) {
    uni.setNavigationBarTitle({ title: product.value.title })
  }
}

// 默认日期：今天可售则今天，否则取最近的日历可售日；都没有则空
function pickDefaultDate() {
  const skuId = selectedSku.value ? Number(selectedSku.value.id || 0) : 0
  const hitOf = (ds) =>
    calendarData.value.find(
      (c) => Number(c.sku_id || 0) === skuId && String(c.date || '').slice(0, 10) === ds
    )
  const todayHit = hitOf(todayStr)
  const todaySellable = todayHit
    ? Number(todayHit.status) === 1 && Number(todayHit.stock || 0) > 0
    : baseStock.value > 0
  if (todaySellable) return todayStr
  const days = calendarData.value
    .filter((c) => Number(c.sku_id || 0) === skuId && Number(c.status) === 1 && Number(c.stock || 0) > 0)
    .map((c) => String(c.date || '').slice(0, 10))
    .filter((ds) => ds >= todayStr)
    .sort()
  return days[0] || ''
}

onLoad((query) => {
  goodsId.value = Number(query && query.id) || null
  if (!goodsId.value) {
    loading.value = false
    uni.showToast({ title: '缺少商品参数', icon: 'none' })
    return
  }
  loadDetail()
})
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
}

.scroll {
  flex: 1;
  /* 关键：flex 子项默认 min-height:auto（=内容高）会阻止收缩，
     内容过长时 scroll-view 被撑高、无法滚动。置 0 后才拿到确定高度。 */
  min-height: 0;
}

.cover {
  width: 100%;
  height: 480rpx;
  display: block;
  background: #e2e8f0;

  &.cover-empty {
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  }
}

.cover-img {
  width: 100%;
  height: 100%;
  display: block;
}

.state-tip {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding: 120rpx 0;
}

.bottom-gap {
  height: 40rpx;
}

.card {
  margin: 24rpx 24rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.05);
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 20rpx;

  &.no-mb {
    margin-bottom: 0;
  }
}

.picked-tip {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 10rpx;
  padding: 12rpx 16rpx;
}

/* 日期摘要行（仿美团一行） */
.cal-bar {
  display: flex;
  align-items: center;

  .cal-bar-label {
    flex-shrink: 0;
    font-size: 26rpx;
    font-weight: 700;
    color: #0f172a;
  }

  .cal-bar-main {
    flex: 1;
    min-width: 0;
    margin: 0 16rpx;
  }

  .cal-bar-date {
    font-size: 26rpx;
    font-weight: 700;
    color: #2563eb;
  }

  .cal-bar-arrow {
    flex-shrink: 0;
    font-size: 40rpx;
    color: #cbd5e1;
  }
}

/* 弹层容器已统一为 components/sheet-popup，此处仅保留弹层内按钮样式 */
.cal-confirm {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 999rpx;
  background: #2563eb;
  color: #fff;
  font-size: 30rpx;
  font-weight: 800;
  border: none;

  &::after {
    border: none;
  }

  &[disabled] {
    opacity: 0.6;
  }
}

/* ===== 主信息卡 ===== */
.main-card {
  position: relative;
  margin: -36rpx 24rpx 0;
  background: #fff;
  border-radius: 28rpx;
  padding: 34rpx 32rpx 30rpx;
  box-shadow: 0 8rpx 30rpx rgba(15, 23, 42, 0.08);

  .title {
    display: block;
    font-size: 38rpx;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.4;
    word-break: break-all;
  }

  .sub-title {
    display: block;
    margin-top: 10rpx;
    font-size: 24rpx;
    color: #64748b;
    line-height: 1.5;
  }

  .price-row {
    display: flex;
    align-items: baseline;
    margin-top: 22rpx;

    .price-main {
      display: flex;
      align-items: baseline;
      color: #ff2d55;

      .p-symbol {
        font-size: 28rpx;
        font-weight: 800;
      }

      .p-num {
        font-size: 56rpx;
        font-weight: 900;
        line-height: 1.1;
      }
    }

    .p-orig {
      margin-left: 18rpx;
      font-size: 24rpx;
      color: #94a3b8;
      text-decoration: line-through;
    }

    .p-sales {
      margin-left: auto;
      font-size: 22rpx;
      color: #94a3b8;
    }
  }

  .tag-row {
    margin-top: 18rpx;

    .tag {
      display: inline-block;
      font-size: 22rpx;
      color: #2563eb;
      background: #eff6ff;
      border-radius: 8rpx;
      padding: 6rpx 16rpx;
    }
  }
}

/* ===== 规格 ===== */
.sku-item {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 20rpx 22rpx;
  margin-bottom: 16rpx;

  &.on {
    background: #eff6ff;
    border-color: #2563eb;
  }

  &.sold {
    opacity: 0.5;
  }

  .sku-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;

    .sku-name {
      font-size: 28rpx;
      font-weight: 700;
      color: #0f172a;
    }

    .sku-stock {
      margin-top: 6rpx;
      font-size: 22rpx;
      color: #94a3b8;
    }
  }

  .sku-price {
    flex-shrink: 0;
    font-size: 30rpx;
    font-weight: 800;
    color: #ff2d55;
  }
}

/* ===== 数量 ===== */
.qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .stepper {
    display: flex;
    align-items: center;

    .step-btn {
      width: 60rpx;
      height: 60rpx;
      line-height: 56rpx;
      text-align: center;
      border-radius: 12rpx;
      background: #f1f5f9;
      color: #0f172a;
      font-size: 36rpx;
      font-weight: 700;

      &.dis {
        color: #cbd5e1;
      }
    }

    .step-num {
      min-width: 76rpx;
      text-align: center;
      font-size: 30rpx;
      font-weight: 800;
      color: #0f172a;
    }
  }
}

.qty-tip {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

/* ===== 明细 ===== */
.item-group {
  margin-bottom: 8rpx;

  .group-name {
    display: block;
    font-size: 26rpx;
    font-weight: 700;
    color: #2563eb;
    margin: 12rpx 0 8rpx;
  }
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f1f5f9;

  .item-name {
    flex: 1;
    min-width: 0;
    font-size: 26rpx;
    color: #334155;
  }

  .item-qty {
    flex-shrink: 0;
    margin-left: 16rpx;
    font-size: 24rpx;
    color: #94a3b8;
  }
}

/* ===== 须知 ===== */
.notice-row {
  display: flex;
  margin-bottom: 12rpx;

  .notice-dot {
    flex-shrink: 0;
    color: #2563eb;
    font-size: 28rpx;
    font-weight: 900;
    margin-right: 10rpx;
    line-height: 1.6;
  }

  .notice-text {
    flex: 1;
    min-width: 0;
    font-size: 25rpx;
    color: #475569;
    line-height: 1.6;
    word-break: break-all;
  }
}

/* ===== 票根优惠 ===== */
.ticket-card {
  display: flex;
  align-items: center;
  background: linear-gradient(90deg, #fff7ed, #fff1f2);
  border: 2rpx solid #fed7aa;

  .ticket-icon {
    font-size: 34rpx;
    margin-right: 14rpx;
  }

  .ticket-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .ticket-text {
    font-size: 24rpx;
    color: #c2410c;
    line-height: 1.5;
  }

  .ticket-line {
    font-size: 22rpx;
    color: #b45309;
    line-height: 1.6;
  }

  .ticket-pick {
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #2563eb;
    font-weight: 700;
  }

  .ticket-picked {
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #15803d;
    font-weight: 700;
  }
}

/* ===== 票根选择弹层 ===== */
.tk-scroll {
  max-height: 60vh;
}

.tk-state {
  padding: 60rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #94a3b8;
}

.tk-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f1f5f9;

  &.dis {
    opacity: 0.5;
  }

  .tk-img {
    width: 100rpx;
    height: 100rpx;
    border-radius: 12rpx;
    background: #e2e8f0;
    flex-shrink: 0;
  }

  .tk-main {
    flex: 1;
    min-width: 0;
    margin-left: 20rpx;
    display: flex;
    flex-direction: column;
  }

  .tk-title {
    font-size: 26rpx;
    font-weight: 700;
    color: #0f172a;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .tk-meta {
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #64748b;
  }

  .tk-bad {
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #b91c1c;
  }

  .tk-ok {
    flex-shrink: 0;
    margin-left: 16rpx;
    font-size: 30rpx;
    color: #2563eb;
    font-weight: 900;
  }
}

.bar-cut {
  margin-left: 12rpx;
  font-size: 22rpx;
  color: #15803d;
  font-weight: 700;
}

/* ===== 商家卡 ===== */
.shop-card {
  display: flex;
  align-items: center;

  .shop-logo {
    width: 96rpx;
    height: 96rpx;
    border-radius: 16rpx;
    background: #e2e8f0;
    flex-shrink: 0;
    margin-right: 20rpx;
  }

  .shop-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;

    .shop-name {
      font-size: 30rpx;
      font-weight: 800;
      color: #0f172a;
    }

    .shop-addr {
      margin-top: 8rpx;
      font-size: 22rpx;
      color: #94a3b8;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  .shop-arrow {
    flex-shrink: 0;
    font-size: 40rpx;
    color: #cbd5e1;
    margin-left: 12rpx;
  }
}

/* ===== 底部购买栏 ===== */
.buy-bar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);

  .bar-price {
    display: flex;
    align-items: baseline;

    .bar-label {
      font-size: 26rpx;
      color: #64748b;
      margin-right: 10rpx;
    }

    .bar-amount {
      display: flex;
      align-items: baseline;
      color: #ff2d55;

      .bar-symbol {
        font-size: 28rpx;
        font-weight: 800;
      }

      .bar-num {
        font-size: 50rpx;
        font-weight: 900;
        line-height: 1.1;
      }
    }
  }

  .buy-btn {
    margin: 0;
    width: 300rpx;
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 999rpx;
    background: linear-gradient(90deg, #ff5c7c, #ff2d55);
    color: #fff;
    font-size: 32rpx;
    font-weight: 800;
    border: none;

    &::after {
      border: none;
    }

    &[disabled] {
      opacity: 0.6;
    }
  }
}
</style>
