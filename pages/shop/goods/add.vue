<template>
  <view class="page">
    <!-- ===== 顶部步骤条 ===== -->
    <view class="stepper">
      <view
        v-for="(s, i) in steps"
        :key="i"
        class="step"
        :class="{ active: i === step, done: i < step }"
        @click="jumpTo(i)"
      >
        <view class="dot">{{ i < step ? '✓' : i + 1 }}</view>
        <text class="step-name">{{ s.title }}</text>
        <view v-if="i < steps.length - 1" class="bar" :class="{ fill: i < step }"></view>
      </view>
    </view>

    <scroll-view class="form-scroll" scroll-y :scroll-top="scrollTop">
      <!-- ===== 第 1 步：基础信息 ===== -->
      <view v-show="step === 0" class="card">
        <text class="card-title">基础信息<text class="card-sub">（必填）</text></text>

        <view class="field">
          <text class="label required">产品标题</text>
          <textarea
            v-model="form.title"
            class="textarea"
            placeholder="如：觉海听涛双人餐"
            placeholder-class="ph"
            auto-height
            :maxlength="60"
          />
        </view>

        <view class="field">
          <text class="label">副标题 / 卖点</text>
          <textarea
            v-model="form.sub_title"
            class="textarea"
            placeholder="如：海景餐厅 · 双人海鲜盛宴"
            placeholder-class="ph"
            auto-height
            :maxlength="80"
          />
        </view>

        <view class="field">
          <text class="label required">产品主图</text>
          <view class="img-row">
            <view v-if="form.cover_image" class="thumb-wrap">
              <image class="thumb" :src="form.cover_image" mode="aspectFill" />
              <text class="thumb-del" @click="form.cover_image = ''">✕</text>
            </view>
            <view v-else class="upload-btn" @click="chooseCover">＋ 上传主图</view>
          </view>
        </view>

        <view class="field">
          <text class="label">轮播图（可多张）</text>
          <view class="img-row">
            <view v-for="(url, i) in imageList" :key="i" class="thumb-wrap">
              <image class="thumb" :src="url" mode="aspectFill" />
              <text class="thumb-del" @click="removeImage(i)">✕</text>
            </view>
            <view class="upload-btn" @click="chooseImages">＋ 添加</view>
          </view>
        </view>

        <view class="field-row">
          <view class="field flex1">
            <text class="label required">业务类型</text>
            <picker mode="selector" :range="BIZ_TYPES" range-key="label" :value="bizIndex" @change="onBizChange">
              <view class="picker-value">{{ BIZ_TYPES[bizIndex].label }}</view>
            </picker>
          </view>
          <view class="field flex1">
            <text class="label required">产品形态</text>
            <picker mode="selector" :range="PRODUCT_TYPES" range-key="label" :value="productIndex" @change="onProductChange">
              <view class="picker-value">{{ PRODUCT_TYPES[productIndex].label }}</view>
            </picker>
          </view>
        </view>
      </view>

      <!-- ===== 第 2 步：价格与库存 ===== -->
      <view v-show="step === 1" class="card">
        <text class="card-title">价格与库存<text class="card-sub">（必填）</text></text>

        <view class="field-row">
          <view class="field flex1">
            <text class="label required">划线原价</text>
            <input v-model="form.original_price" class="input" type="digit" placeholder="如：688" placeholder-class="ph" />
          </view>
          <view class="field flex1">
            <text class="label required">团购价</text>
            <input v-model="form.selling_price" class="input" type="digit" placeholder="如：468" placeholder-class="ph" />
          </view>
        </view>

        <view class="field-row">
          <view class="field flex1">
            <text class="label required">总库存</text>
            <input v-model="form.total_stock" class="input" type="number" placeholder="如：100" placeholder-class="ph" />
          </view>
          <view class="field flex1">
            <text class="label">库存机制</text>
            <picker mode="selector" :range="STOCK_TYPES" range-key="label" :value="stockIndex" @change="onStockChange">
              <view class="picker-value">{{ STOCK_TYPES[stockIndex].label }}</view>
            </picker>
          </view>
        </view>

        <!-- 商品状态：仅编辑模式显示 -->
        <view v-if="isEdit" class="field">
          <text class="label">商品状态</text>
          <picker mode="selector" :range="GOODS_STATUS" range-key="label" :value="statusIndex" @change="onStatusChange">
            <view class="picker-value">{{ GOODS_STATUS[statusIndex].label }}</view>
          </picker>
        </view>

        <view v-if="Number(saveAmount) > 0" class="hint">团购价低于原价，用户将看到「立省 ¥{{ saveAmount }}」。</view>
      </view>

      <!-- ===== 第 3 步：有效期 ===== -->
      <view v-show="step === 2" class="card">
        <text class="card-title">有效期<text class="card-sub">（必填）</text></text>

        <view class="field">
          <text class="label">有效期类型</text>
          <picker mode="selector" :range="VALID_TYPES" range-key="label" :value="validIndex" @change="onValidChange">
            <view class="picker-value">{{ VALID_TYPES[validIndex].label }}</view>
          </picker>
        </view>

        <template v-if="form.valid_type === 1">
          <view class="field-row">
            <view class="field flex1">
              <text class="label">开始时间</text>
              <picker mode="date" :value="startDate" @change="onStartChange">
                <view class="picker-value">{{ startDate || '请选择' }}</view>
              </picker>
            </view>
            <view class="field flex1">
              <text class="label">结束时间</text>
              <picker mode="date" :value="endDate" @change="onEndChange">
                <view class="picker-value">{{ endDate || '请选择' }}</view>
              </picker>
            </view>
          </view>
        </template>

        <view v-else class="field">
          <text class="label">购买后有效天数</text>
          <input v-model="form.valid_days" class="input" type="number" placeholder="如：30" placeholder-class="ph" />
        </view>
      </view>

      <!-- ===== 第 4 步：更多设置（选填） ===== -->
      <view v-show="step === 3">
        <view class="more-tip">
          <text class="more-tip-text">以下均为选填，可直接提交；后续也可在编辑页补充。</text>
        </view>

        <!-- 规格 / SKU -->
        <view class="card">
          <view class="card-head" @click="toggle('sku')">
            <text class="card-title">规格 / SKU</text>
            <text class="card-state">{{ skus.length ? `已添加 ${skus.length}` : '未添加' }}<text class="chev" :class="{ up: open.sku }">⌄</text></text>
          </view>
          <view v-show="open.sku">
            <view v-for="(sku, i) in skus" :key="i" class="sub-block">
              <view class="sub-head">
                <text class="sub-title">规格 {{ i + 1 }}</text>
                <text class="sub-del" @click="removeSku(i)">删除</text>
              </view>
              <view class="field">
                <text class="label">规格名称</text>
                <input v-model="sku.sku_name" class="input" placeholder="如：双人豪华餐" placeholder-class="ph" @input="markSkuDirty" />
              </view>
              <view class="field-row">
                <view class="field flex1">
                  <text class="label">划线原价</text>
                  <input v-model="sku.original_price" class="input" type="digit" placeholder="688" placeholder-class="ph" @input="markSkuDirty" />
                </view>
                <view class="field flex1">
                  <text class="label">售卖价</text>
                  <input v-model="sku.price" class="input" type="digit" placeholder="468" placeholder-class="ph" @input="markSkuDirty" />
                </view>
              </view>
              <view class="field-row">
                <view class="field flex1">
                  <text class="label">库存</text>
                  <input v-model="sku.stock" class="input" type="number" placeholder="100" placeholder-class="ph" @input="markSkuDirty" />
                </view>
                <view class="field flex1">
                  <text class="label">SKU 编码</text>
                  <input v-model="sku.sku_code" class="input" placeholder="MEAL-001" placeholder-class="ph" @input="markSkuDirty" />
                </view>
              </view>
            </view>
            <view class="add-line" @click="addSku">＋ 添加规格</view>
            <text v-if="!skus.length" class="empty-tip">未添加规格，将按主价格售卖</text>
          </view>
        </view>

        <!-- 明细清单 -->
        <view class="card">
          <view class="card-head" @click="toggle('item')">
            <text class="card-title">明细清单</text>
            <text class="card-state">{{ items.length ? `已添加 ${items.length}` : '未添加' }}<text class="chev" :class="{ up: open.item }">⌄</text></text>
          </view>
          <view v-show="open.item">
            <view v-for="(it, i) in items" :key="i" class="sub-block">
              <view class="sub-head">
                <text class="sub-title">明细 {{ i + 1 }}</text>
                <text class="sub-del" @click="removeItem(i)">删除</text>
              </view>
              <view class="field-row">
                <view class="field flex1">
                  <text class="label">分组</text>
                  <input v-model="it.group_name" class="input" placeholder="如：热菜" placeholder-class="ph" @input="markItemDirty" />
                </view>
                <view class="field flex1">
                  <text class="label">名称</text>
                  <input v-model="it.item_name" class="input" placeholder="如：清蒸石斑鱼" placeholder-class="ph" @input="markItemDirty" />
                </view>
              </view>
              <view class="field-row">
                <view class="field flex1">
                  <text class="label">数量</text>
                  <input v-model="it.quantity" class="input" type="number" placeholder="1" placeholder-class="ph" @input="markItemDirty" />
                </view>
                <view class="field flex1">
                  <text class="label">单位</text>
                  <input v-model="it.unit" class="input" placeholder="份" placeholder-class="ph" @input="markItemDirty" />
                </view>
                <view class="field flex1">
                  <text class="label">参考价值</text>
                  <input v-model="it.price" class="input" type="digit" placeholder="268" placeholder-class="ph" @input="markItemDirty" />
                </view>
              </view>
            </view>
            <view class="add-line" @click="addItem">＋ 添加明细</view>
            <text v-if="!items.length" class="empty-tip">未添加明细</text>
          </view>
        </view>

        <!-- 使用规则 -->
        <view class="card">
          <view class="card-head" @click="toggle('rule')">
            <text class="card-title">使用规则</text>
            <text class="card-state">选填<text class="chev" :class="{ up: open.rule }">⌄</text></text>
          </view>
          <view v-show="open.rule">
            <view class="field">
              <text class="label">预约规则</text>
              <picker mode="selector" :range="APPOINT_TYPES" range-key="label" :value="appointIndex" @change="onAppointChange">
                <view class="picker-value">{{ APPOINT_TYPES[appointIndex].label }}</view>
              </picker>
            </view>

            <view v-if="form.rule.need_appointment === 1" class="field">
              <text class="label">需提前预约（小时）</text>
              <input v-model="form.rule.appointment_advance_hours" class="input" type="number" placeholder="24 代表提前 1 天" placeholder-class="ph" @input="markRuleDirty" />
            </view>

            <view class="field-row">
              <view class="field flex1">
                <text class="label">出行人实名</text>
                <picker mode="selector" :range="YES_NO" range-key="label" :value="realNameIndex" @change="onRealNameChange">
                  <view class="picker-value">{{ YES_NO[realNameIndex].label }}</view>
                </picker>
              </view>
              <view class="field flex1">
                <text class="label">退改规则</text>
                <picker mode="selector" :range="REFUND_TYPES" range-key="label" :value="refundIndex" @change="onRefundChange">
                  <view class="picker-value">{{ REFUND_TYPES[refundIndex].label }}</view>
                </picker>
              </view>
            </view>

            <view class="field">
              <text class="label">预约 / 咨询电话</text>
              <input v-model="form.rule.appointment_phone" class="input" placeholder="如：0571-88888888" placeholder-class="ph" @input="markRuleDirty" />
            </view>

            <view class="field">
              <text class="label">单用户限购（0 不限）</text>
              <input v-model="form.rule.limit_per_user" class="input" type="number" placeholder="0" placeholder-class="ph" @input="markRuleDirty" />
            </view>
          </view>
        </view>

        <!-- 票根联运优惠 -->
        <view class="card">
          <view class="card-head" @click="toggle('ticket')">
            <text class="card-title">票根联运优惠</text>
            <text class="card-state">{{ form.ticket_discount.is_enabled === 1 ? '已开启' : '未开启' }}<text class="chev" :class="{ up: open.ticket }">⌄</text></text>
          </view>
          <view v-show="open.ticket">
            <view class="field">
              <text class="label">是否开启</text>
              <picker mode="selector" :range="YES_NO" range-key="label" :value="ticketEnabledIndex" @change="onTicketEnabledChange">
                <view class="picker-value">{{ YES_NO[ticketEnabledIndex].label }}</view>
              </picker>
            </view>

            <template v-if="form.ticket_discount.is_enabled === 1">
              <view class="field">
                <text class="label">支持票种（逗号分隔）</text>
                <input v-model="form.ticket_discount.allow_ticket_categories" class="input" placeholder="火车票,飞机票,景区门票" placeholder-class="ph" @input="markTicketDirty" />
              </view>
              <view class="field">
                <text class="label">限定到达城市</text>
                <input v-model="form.ticket_discount.match_destination_city" class="input" placeholder="如：杭州" placeholder-class="ph" @input="markTicketDirty" />
              </view>
              <view class="field-row">
                <view class="field flex1">
                  <text class="label">优惠类型</text>
                  <picker mode="selector" :range="DISCOUNT_TYPES" range-key="label" :value="discountTypeIndex" @change="onDiscountTypeChange">
                    <view class="picker-value">{{ DISCOUNT_LABEL }}</view>
                  </picker>
                </view>
                <view class="field flex1">
                  <text class="label">{{ form.ticket_discount.discount_type === 2 ? '折扣率（0.85=85折）' : '立减金额（元）' }}</text>
                  <input v-model="form.ticket_discount.discount_value" class="input" type="digit" placeholder-class="ph" @input="markTicketDirty" />
                </view>
              </view>
              <view class="field">
                <text class="label">票根时效（天）</text>
                <input v-model="form.ticket_discount.ticket_valid_days" class="input" type="number" placeholder="3" placeholder-class="ph" @input="markTicketDirty" />
              </view>
            </template>
            <text v-else class="empty-tip">未开启，开启后可凭票根享优惠</text>
          </view>
        </view>

        <!-- 日历价格：仅动态库存（StockType=2，酒店/景区）显示 -->
        <view v-if="Number(form.stock_type) === 2" class="card">
          <view class="card-head" @click="toggle('calendar')">
            <text class="card-title">日历价格</text>
            <text class="card-state">{{ calendarState }}<text class="chev" :class="{ up: open.calendar }">⌄</text></text>
          </view>
          <view v-show="open.calendar">
            <!-- 批量生成 -->
            <view class="batch-box">
              <view class="field-row">
                <view class="field flex1">
                  <text class="label">开始日期</text>
                  <picker mode="date" :value="batchStart" @change="onBatchStart">
                    <view class="picker-value">{{ batchStart || '请选择' }}</view>
                  </picker>
                </view>
                <view class="field flex1">
                  <text class="label">结束日期</text>
                  <picker mode="date" :value="batchEnd" @change="onBatchEnd">
                    <view class="picker-value">{{ batchEnd || '请选择' }}</view>
                  </picker>
                </view>
              </view>

              <view class="field-row">
                <view class="field flex1">
                  <text class="label">平时价</text>
                  <input v-model="batchWeekdayPrice" class="input" type="digit" placeholder="398" placeholder-class="ph" />
                </view>
                <view class="field flex1">
                  <text class="label">周末价</text>
                  <input v-model="batchWeekendPrice" class="input" type="digit" placeholder="598" placeholder-class="ph" />
                </view>
                <view class="field flex1">
                  <text class="label">节假日价</text>
                  <input v-model="batchHolidayPrice" class="input" type="digit" placeholder="888" placeholder-class="ph" />
                </view>
              </view>

              <view class="field-row">
                <view class="field flex1">
                  <text class="label">每日库存</text>
                  <input v-model="batchStock" class="input" type="number" placeholder="20" placeholder-class="ph" />
                </view>
                <view class="field flex1 batch-btn-wrap">
                  <text class="batch-btn" @click="batchGenerate">批量生成</text>
                </view>
              </view>

              <text class="batch-tip">按日期范围套用三档价，生成后可在下方逐日改价 / 标记停售。</text>
            </view>

            <!-- 逐日微调列表 -->
            <view v-if="calendar.length" class="cal-list">
              <view v-for="(c, i) in calendar" :key="`${c.sku_id}_${c.date}`" class="cal-row">
                <view class="cal-date">
                  <text class="cal-d">{{ c.date }}</text>
                  <text class="cal-week">{{ weekdayText(c.date) }}</text>
                </view>
                <input v-model="c.price" class="cal-input" type="digit" placeholder="价格" placeholder-class="ph" @input="markCalendarDirty" />
                <input v-model="c.stock" class="cal-input" type="number" placeholder="库存" placeholder-class="ph" @input="markCalendarDirty" />
                <text class="cal-status" :class="{ off: Number(c.status) === 0 }" @click="toggleCalStatus(i)">
                  {{ Number(c.status) === 1 ? '可售' : '停售' }}
                </text>
                <text class="cal-del" @click="removeCalDay(i)">✕</text>
              </view>
              <text class="cal-clear" @click="clearCalendar">清空全部日历</text>
            </view>
            <text v-else class="empty-tip">尚未配置日历；未配置的日期将按默认价售卖</text>
          </view>
        </view>
      </view>

      <view class="bottom-gap"></view>
    </scroll-view>

    <!-- ===== 底部固定操作栏 ===== -->
    <view class="footer">
      <button v-if="step > 0" class="btn ghost" @click="prev">上一步</button>
      <button class="btn primary" :disabled="submitting" @click="nextOrSubmit">
        {{ step < steps.length - 1 ? '下一步' : (submitting ? '提交中...' : (isEdit ? '保存修改' : '提交')) }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addShopGoods, editShopGoods, getShopGoodsDetail } from '@/api/shop.js'
import { getShopApplyStatus } from '@/api/shop.js'
import { uploadImage } from '@/api/upload.js'
import { compressImage } from '@/utils/compressImage.js'
import { useSubmit } from '@/utils/submitGuard.js'
import { isHolidayCN } from '@/utils/holidays.js'

// ===== 选项字典（value 与后端枚举一致）=====
const BIZ_TYPES = [
  { value: 'EAT', label: '吃' },
  { value: 'HOTEL', label: '住' },
  { value: 'TRAVEL', label: '行' },
  { value: 'TOUR', label: '游' },
  { value: 'SHOP', label: '购' },
  { value: 'FUN', label: '娱' }
]
const PRODUCT_TYPES = [
  { value: 'SET_MEAL', label: '套餐' },
  { value: 'VOUCHER', label: '代金券' },
  { value: 'ROOM_NIGHT', label: '房晚' },
  { value: 'TICKET', label: '门票' },
  { value: 'TRANSFER', label: '接送机' },
  { value: 'RENTAL', label: '租车' }
]
const STOCK_TYPES = [
  { value: 1, label: '总库存机制' },
  { value: 2, label: '每日/场次动态库存' }
]
const VALID_TYPES = [
  { value: 1, label: '指定时间段' },
  { value: 2, label: '购买后 X 天内有效' }
]
const APPOINT_TYPES = [
  { value: 0, label: '免预约' },
  { value: 1, label: '需提前预约' },
  { value: 2, label: '指定场次/日期使用' }
]
const REFUND_TYPES = [
  { value: 1, label: '随时退 / 过期自动退' },
  { value: 2, label: '条件退' },
  { value: 3, label: '不可退' }
]
const DISCOUNT_TYPES = [
  { value: 1, label: '凭票立减固定金额' },
  { value: 2, label: '凭票打折' }
]
const YES_NO = [
  { value: 0, label: '否' },
  { value: 1, label: '是' }
]
// 商品状态（编辑时可调整）
const GOODS_STATUS = [
  { value: 0, label: '草稿' },
  { value: 1, label: '待审核' },
  { value: 2, label: '已上架' },
  { value: 3, label: '已下架' }
]

// 分步向导：把长表单拆成 4 步，每步只聚焦一组信息
const steps = [
  { title: '基础信息' },
  { title: '价格库存' },
  { title: '有效期' },
  { title: '更多设置' }
]

const shopId = ref(null)
const imageList = ref([])
// 商品 ID：有值表示编辑模式，null 表示新增模式
const goodsId = ref(null)
const isEdit = computed(() => goodsId.value != null)

// 当前步骤 + 滚动位置
const step = ref(0)
const scrollTop = ref(0)
// 第 4 步各选填分区展开状态（默认收起，避免一次性输入过多）
const open = reactive({ sku: false, item: false, rule: false, ticket: false, calendar: false })

// 子表「是否被改动」标记：编辑时未改动的字段不提交，避免误清空后端原有数据
const skuDirty = ref(false)
const itemDirty = ref(false)
const ruleDirty = ref(false)
const ticketDirty = ref(false)

const form = reactive({
  title: '',
  sub_title: '',
  cover_image: '',
  biz_type: 'EAT',
  product_type: 'SET_MEAL',
  original_price: '',
  selling_price: '',
  total_stock: '',
  stock_type: 1,
  valid_type: 1,
  valid_days: '',
  valid_start: '',
  valid_end: '',
  // 商品状态：仅编辑模式使用（新增由后端默认）
  status: 0,
  rule: {
    need_appointment: 0,
    appointment_advance_hours: '',
    need_real_name: 0,
    appointment_phone: '',
    limit_per_user: '',
    limit_per_order: '',
    refund_rule: 1
  },
  ticket_discount: {
    is_enabled: 0,
    allow_ticket_categories: '',
    match_destination_city: '',
    discount_type: 1,
    discount_value: '',
    ticket_valid_days: 3
  }
})

const skus = ref([])
const items = ref([])

// picker 选中下标（与 form 值双向同步）
const bizIndex = computed(() => indexOf(BIZ_TYPES, form.biz_type))
const productIndex = computed(() => indexOf(PRODUCT_TYPES, form.product_type))
const stockIndex = computed(() => indexOf(STOCK_TYPES, form.stock_type))
const validIndex = computed(() => indexOf(VALID_TYPES, form.valid_type))
const appointIndex = computed(() => indexOf(APPOINT_TYPES, form.rule.need_appointment))
const refundIndex = computed(() => indexOf(REFUND_TYPES, form.rule.refund_rule))
const realNameIndex = computed(() => indexOf(YES_NO, form.rule.need_real_name))
const ticketEnabledIndex = computed(() => indexOf(YES_NO, form.ticket_discount.is_enabled))
const discountTypeIndex = computed(() => indexOf(DISCOUNT_TYPES, form.ticket_discount.discount_type))
const statusIndex = computed(() => indexOf(GOODS_STATUS, form.status))
const DISCOUNT_LABEL = computed(() => DISCOUNT_TYPES[discountTypeIndex.value].label)

// 日期 picker 只到天，展示用；提交时补成 YYYY-MM-DD HH:mm:ss
const startDate = computed(() => String(form.valid_start || '').slice(0, 10))
const endDate = computed(() => String(form.valid_end || '').slice(0, 10))
// 立省金额（价格步骤提示用）
const saveAmount = computed(() => {
  const o = Number(form.original_price)
  const s = Number(form.selling_price)
  if (o > s && s > 0) return (o - s).toFixed(2).replace(/\.00$/, '')
  return 0
})

function indexOf(list, value) {
  const i = list.findIndex((x) => x.value === value)
  return i > -1 ? i : 0
}

function onBizChange(e) {
  form.biz_type = BIZ_TYPES[e.detail.value].value
}
function onProductChange(e) {
  form.product_type = PRODUCT_TYPES[e.detail.value].value
}
function onStockChange(e) {
  form.stock_type = STOCK_TYPES[e.detail.value].value
}
function onStatusChange(e) {
  form.status = GOODS_STATUS[e.detail.value].value
}
function onValidChange(e) {
  form.valid_type = VALID_TYPES[e.detail.value].value
}
function onAppointChange(e) {
  form.rule.need_appointment = APPOINT_TYPES[e.detail.value].value
  ruleDirty.value = true
}
function onRefundChange(e) {
  form.rule.refund_rule = REFUND_TYPES[e.detail.value].value
  ruleDirty.value = true
}
function onRealNameChange(e) {
  form.rule.need_real_name = YES_NO[e.detail.value].value
  ruleDirty.value = true
}
function onTicketEnabledChange(e) {
  form.ticket_discount.is_enabled = YES_NO[e.detail.value].value
  ticketDirty.value = true
}
function onDiscountTypeChange(e) {
  form.ticket_discount.discount_type = DISCOUNT_TYPES[e.detail.value].value
  ticketDirty.value = true
}
// 子表文本输入：一旦改动就标记 dirty，编辑时才会提交该子表
function markRuleDirty() {
  ruleDirty.value = true
}
function markTicketDirty() {
  ticketDirty.value = true
}
function onStartChange(e) {
  form.valid_start = `${e.detail.value} 00:00:00`
}
function onEndChange(e) {
  form.valid_end = `${e.detail.value} 23:59:59`
}

// 第 4 步分区折叠
function toggle(key) {
  open[key] = !open[key]
}

// ===== 步骤导航 =====
function resetScroll() {
  // 切换步骤后回到顶部（用微调触发 scroll-view 重渲染）
  scrollTop.value = scrollTop.value === 0 ? 0.1 : 0
}
function nextOrSubmit() {
  if (step.value < steps.length - 1) {
    if (!validateStep(step.value)) return
    step.value++
    resetScroll()
  } else {
    onSubmit()
  }
}
function prev() {
  if (step.value > 0) {
    step.value--
    resetScroll()
  }
}
// 点击步骤条：可回退到任意已到过的步骤；向前跳转需逐步校验通过
function jumpTo(i) {
  if (i === step.value) return
  if (i < step.value) {
    step.value = i
    resetScroll()
    return
  }
  for (let k = step.value; k < i; k++) {
    if (!validateStep(k)) {
      step.value = k
      resetScroll()
      return
    }
  }
  step.value = i
  resetScroll()
}
// 逐步校验：只校验当前步骤的必填项，通过返回 true
function validateStep(idx) {
  if (idx === 0) {
    if (!form.title.trim()) {
      toast('请输入产品标题')
      return false
    }
    if (!form.cover_image) {
      toast('请上传产品主图')
      return false
    }
  } else if (idx === 1) {
    if (!(Number(form.original_price) > 0)) {
      toast('请输入划线原价')
      return false
    }
    if (!(Number(form.selling_price) > 0)) {
      toast('请输入团购价')
      return false
    }
    if (!(Number(form.total_stock) > 0)) {
      toast('请输入总库存')
      return false
    }
  } else if (idx === 2) {
    if (form.valid_type === 1 && (!form.valid_start || !form.valid_end)) {
      toast('请选择有效期起止时间')
      return false
    }
    if (form.valid_type === 2 && !(Number(form.valid_days) > 0)) {
      toast('请输入购买后有效天数')
      return false
    }
  }
  return true
}

// ===== 图片上传 =====
function pickUrl(res) {
  return res?.data?.url || res?.data?.urls?.[0] || res?.url || ''
}

// 选图并返回临时路径（Promise 化），使「选图 + 上传」整体处于提交锁内
function pickImagePaths(count) {
  return new Promise((resolve) => {
    uni.chooseImage({
      count,
      sizeType: ['compressed'],
      success: (r) => resolve(r.tempFilePaths || []),
      fail: () => resolve([])
    })
  })
}

// 上传主图（真正调用接口，由 useSubmit 加锁防重复）
async function doUploadCover() {
  const paths = await pickImagePaths(1)
  if (!paths.length) return
  uni.showLoading({ title: '上传中...', mask: true })
  try {
    const file = await compressImage(paths[0])
    const res = await uploadImage(file)
    const url = pickUrl(res)
    if (url) form.cover_image = url
    else uni.showToast({ title: '获取图片链接失败', icon: 'none' })
  } catch (err) {
    uni.showToast({ title: '上传失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// 上传轮播图（多张，真正调用接口，由 useSubmit 加锁防重复）
async function doUploadImages() {
  const paths = await pickImagePaths(9)
  if (!paths.length) return
  uni.showLoading({ title: '上传中...', mask: true })
  try {
    const list = await Promise.all(
      paths.map(async (p) => pickUrl(await uploadImage(await compressImage(p))))
    )
    imageList.value.push(...list.filter(Boolean))
  } catch (err) {
    uni.showToast({ title: '上传失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// 统一防重复提交：避免连点弹出多个选择器 / 重复上传
const { submit: chooseCover } = useSubmit(doUploadCover, { cooldown: 800 })
const { submit: chooseImages } = useSubmit(doUploadImages, { cooldown: 800 })

function removeImage(i) {
  imageList.value.splice(i, 1)
}

// ===== SKU / 明细增删 =====
function addSku() {
  open.sku = true
  skus.value.push({ sku_name: '', original_price: '', price: '', stock: '', sku_code: '' })
  skuDirty.value = true
}
function removeSku(i) {
  skus.value.splice(i, 1)
  skuDirty.value = true
}
function markSkuDirty() {
  skuDirty.value = true
}
function addItem() {
  open.item = true
  items.value.push({ group_name: '', item_name: '', quantity: 1, unit: '份', price: '' })
  itemDirty.value = true
}
function removeItem(i) {
  items.value.splice(i, 1)
  itemDirty.value = true
}
function markItemDirty() {
  itemDirty.value = true
}

// ===== 日历价格（仅 StockType=2 动态库存，酒店/景区）=====
// 数据结构对齐后端 goods_daily_calendar：{ sku_id, date, price, stock, status }
// sku_id=0 表示商品维度（无规格）；有规格商品按 SKU 分别配置时再填具体 sku_id
const calendar = ref([])
const calendarDirty = ref(false)
// 批量生成输入
const batchStart = ref('')
const batchEnd = ref('')
const batchWeekdayPrice = ref('')
const batchWeekendPrice = ref('')
const batchHolidayPrice = ref('')
const batchStock = ref('')

const calendarState = computed(() =>
  calendar.value.length ? `已配置 ${calendar.value.length} 天` : '未配置'
)

function pad2(n) {
  return String(n).padStart(2, '0')
}
function fmtDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
// 提交给后端的日历日期：后端用 Go time.Time 解析，需要 RFC3339 完整时间，
// 传纯 'YYYY-MM-DD' 会报 400：parsing time ... cannot parse "" as "T"
function toCalDate(dateStr) {
  return dateStr ? `${dateStr}T00:00:00+08:00` : ''
}
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
function weekdayText(dateStr) {
  if (!dateStr) return ''
  return WEEK[new Date(`${dateStr}T00:00:00`).getDay()]
}
function onBatchStart(e) {
  batchStart.value = e.detail.value
}
function onBatchEnd(e) {
  batchEnd.value = e.detail.value
}

// 批量生成：按日期范围 + 平时/周末/节假日三档价一键铺满，再支持逐日微调
function batchGenerate() {
  if (!batchStart.value || !batchEnd.value) {
    toast('请选择开始和结束日期')
    return
  }
  const start = new Date(`${batchStart.value}T00:00:00`)
  const end = new Date(`${batchEnd.value}T00:00:00`)
  if (start > end) {
    toast('开始日期不能晚于结束日期')
    return
  }
  const wp = Number(batchWeekdayPrice.value)
  const wep = Number(batchWeekendPrice.value)
  const hp = Number(batchHolidayPrice.value)
  const stk = Number(batchStock.value || 0)
  if (!(wp > 0) && !(wep > 0) && !(hp > 0)) {
    toast('请至少填写一档价格')
    return
  }

  // 以 date 为键合并，重复生成时覆盖同一天，不产生重复记录
  const map = new Map(calendar.value.map((c) => [`${c.sku_id}_${c.date}`, c]))
  const DAY = 86400000
  for (let t = start.getTime(); t <= end.getTime(); t += DAY) {
    const d = new Date(t)
    const ds = fmtDate(d)
    let price = wp
    if (isHolidayCN(ds) && hp > 0) price = hp
    else if ((d.getDay() === 0 || d.getDay() === 6) && wep > 0) price = wep
    map.set(`0_${ds}`, {
      sku_id: 0,
      date: ds,
      price: price > 0 ? String(price) : '',
      stock: stk > 0 ? String(stk) : '',
      status: 1
    })
  }
  calendar.value = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1))
  calendarDirty.value = true
  open.calendar = true
}

function markCalendarDirty() {
  calendarDirty.value = true
}
function toggleCalStatus(i) {
  calendar.value[i].status = Number(calendar.value[i].status) === 1 ? 0 : 1
  calendarDirty.value = true
}
function removeCalDay(i) {
  calendar.value.splice(i, 1)
  calendarDirty.value = true
}
function clearCalendar() {
  calendar.value = []
  calendarDirty.value = true
}

// ===== 提交 =====
// 提交接口调用：由 useSubmit 统一加锁防重复，避免快速连点重复下单
async function submitGoods() {
  const payload = {
    shop_id: Number(shopId.value),
    title: form.title.trim(),
    sub_title: form.sub_title.trim(),
    cover_image: form.cover_image,
    // 后端要求轮播图为 JSON 字符串
    images: imageList.value.length ? JSON.stringify(imageList.value) : '',
    biz_type: form.biz_type,
    product_type: form.product_type,
    original_price: Number(form.original_price),
    selling_price: Number(form.selling_price),
    total_stock: Number(form.total_stock),
    stock_type: Number(form.stock_type),
    valid_type: Number(form.valid_type)
  }

  // 编辑模式带上商品 ID 与状态
  if (isEdit.value) {
    payload.id = Number(goodsId.value)
    payload.status = Number(form.status)
  }

  if (form.valid_type === 1) {
    payload.valid_start = form.valid_start
    payload.valid_end = form.valid_end
  } else {
    payload.valid_days = Number(form.valid_days)
  }

  // 只提交填写完整的 SKU
  const skuList = skus.value
    .filter((s) => s.sku_name && Number(s.price) > 0)
    .map((s) => ({
      sku_name: s.sku_name,
      original_price: Number(s.original_price || 0),
      price: Number(s.price),
      stock: Number(s.stock || 0),
      sku_code: s.sku_code || ''
    }))
  // 新增：有就传；编辑：只有改动过才传（未改动不传=保留原数据，清空时传 []）
  if (!isEdit.value) {
    if (skuList.length) payload.skus = skuList
  } else if (skuDirty.value) {
    payload.skus = skuList
  }

  const itemList = items.value
    .filter((it) => it.group_name && it.item_name)
    .map((it) => ({
      group_name: it.group_name,
      item_name: it.item_name,
      quantity: Number(it.quantity || 1),
      unit: it.unit || '份',
      price: Number(it.price || 0),
      is_choice: 0
    }))
  if (!isEdit.value) {
    if (itemList.length) payload.items = itemList
  } else if (itemDirty.value) {
    payload.items = itemList
  }

  // 规则：新增总是传；编辑时只有改动过才传
  const rulePayload = {
    need_appointment: Number(form.rule.need_appointment),
    appointment_advance_hours: Number(form.rule.appointment_advance_hours || 0),
    need_real_name: Number(form.rule.need_real_name),
    appointment_phone: form.rule.appointment_phone || '',
    limit_per_user: Number(form.rule.limit_per_user || 0),
    limit_per_order: Number(form.rule.limit_per_order || 0),
    refund_rule: Number(form.rule.refund_rule)
  }
  if (!isEdit.value || ruleDirty.value) payload.rule = rulePayload

  // 票根优惠：新增时关闭就不传；编辑时改动过才传（is_enabled != 1 后端会清空不重建）
  if (!isEdit.value) {
    if (form.ticket_discount.is_enabled === 1) payload.ticket_discount = buildTicketDiscount()
  } else if (ticketDirty.value) {
    payload.ticket_discount = buildTicketDiscount()
  }

  // 日历价格（仅 StockType=2 有意义）：沿用子表三语义
  // 不传=保留原数据；传 []=清空；传数组=全量重建（需传完整最终列表）
  // 日历价格仅对动态库存（StockType=2）有意义：其他业态不提交，保留后端原数据
  if (Number(form.stock_type) === 2) {
    const calPayload = calendar.value.map((c) => ({
      sku_id: Number(c.sku_id || 0),
      // 后端要求 RFC3339 时间，不能传纯日期（否则 400：cannot parse "" as "T"）
      date: toCalDate(c.date),
      price: Number(c.price || 0),
      stock: Number(c.stock || 0),
      status: Number(c.status || 1)
    }))
    if (!isEdit.value) {
      if (calPayload.length) payload.calendar = calPayload
    } else if (calendarDirty.value) {
      payload.calendar = calPayload
    }
  }

  const res = isEdit.value ? await editShopGoods(payload) : await addShopGoods(payload)
  if (res) {
    uni.showToast({ title: isEdit.value ? '保存成功' : '添加成功', icon: 'success' })
    // 成功后延迟 1.2s 跳转，冷却期需覆盖该窗口，防止这段时间被再次点击
    setTimeout(() => uni.navigateBack(), 1200)
  }
}

// 统一防重复提交：submitting 绑定到按钮 :disabled / 按钮文案（原内联锁逻辑已由 useSubmit 接管）
const { loading: submitting, submit: onSubmit } = useSubmit(submitGoods, { cooldown: 1300 })

// 票根联运优惠子对象
function buildTicketDiscount() {
  return {
    is_enabled: Number(form.ticket_discount.is_enabled),
    allow_ticket_categories: form.ticket_discount.allow_ticket_categories || '',
    match_destination_city: form.ticket_discount.match_destination_city || '',
    discount_type: Number(form.ticket_discount.discount_type),
    discount_value: Number(form.ticket_discount.discount_value || 0),
    ticket_valid_days: Number(form.ticket_discount.ticket_valid_days || 3)
  }
}

function toast(title) {
  uni.showToast({ title, icon: 'none' })
}

// 编辑回显：主表 + 子表（详情接口返回完整的 SKU / 明细 / 规则 / 票根优惠）
function applyDetail(d) {
  applyGoods(d.product || {})

  // SKU 规格
  const skuList = Array.isArray(d.skus) ? d.skus : []
  skus.value = skuList.map((s) => ({
    sku_name: s.sku_name || '',
    original_price: s.original_price != null ? String(s.original_price) : '',
    price: s.price != null ? String(s.price) : '',
    stock: s.stock != null ? String(s.stock) : '',
    sku_code: s.sku_code || ''
  }))

  // 明细清单
  const itemList = Array.isArray(d.items) ? d.items : []
  items.value = itemList.map((it) => ({
    group_name: it.group_name || '',
    item_name: it.item_name || '',
    quantity: it.quantity != null ? Number(it.quantity) : 1,
    unit: it.unit || '份',
    price: it.price != null ? String(it.price) : ''
  }))

  // 日历价格（StockType=2）：接口返回全部日历记录（含停售），date 取日期部分
  const calList = Array.isArray(d.calendar) ? d.calendar : []
  calendar.value = calList.map((c) => ({
    sku_id: Number(c.sku_id || 0),
    date: String(c.date || '').slice(0, 10),
    price: c.price != null ? String(c.price) : '',
    stock: c.stock != null ? String(c.stock) : '',
    status: c.status != null ? Number(c.status) : 1
  }))

  // 核销/使用规则
  if (d.rule) {
    const r = d.rule
    form.rule.need_appointment = Number(r.need_appointment) || 0
    form.rule.appointment_advance_hours =
      r.appointment_advance_hours != null ? String(r.appointment_advance_hours) : ''
    form.rule.need_real_name = Number(r.need_real_name) || 0
    form.rule.appointment_phone = r.appointment_phone || ''
    form.rule.limit_per_user = r.limit_per_user != null ? String(r.limit_per_user) : ''
    form.rule.limit_per_order = r.limit_per_order != null ? String(r.limit_per_order) : ''
    form.rule.refund_rule = Number(r.refund_rule) || 1
  }

  // 票根联运优惠
  if (d.ticket_discount) {
    const t = d.ticket_discount
    form.ticket_discount.is_enabled = Number(t.is_enabled) || 0
    form.ticket_discount.allow_ticket_categories = t.allow_ticket_categories || ''
    form.ticket_discount.match_destination_city = t.match_destination_city || ''
    form.ticket_discount.discount_type = Number(t.discount_type) || 1
    form.ticket_discount.discount_value =
      t.discount_value != null ? String(t.discount_value) : ''
    form.ticket_discount.ticket_valid_days = Number(t.ticket_valid_days) || 3
  }

  // 回显的内容不算用户改动：重置脏标记，避免提交时误触发子表全量重建
  skuDirty.value = false
  itemDirty.value = false
  ruleDirty.value = false
  ticketDirty.value = false
  calendarDirty.value = false
}

// 主表字段回显
function applyGoods(g) {
  form.title = g.title || ''
  form.sub_title = g.sub_title || ''
  form.cover_image = g.cover_image || ''
  form.biz_type = g.biz_type || 'EAT'
  form.product_type = g.product_type || 'SET_MEAL'
  form.original_price = g.original_price != null ? String(g.original_price) : ''
  form.selling_price = g.selling_price != null ? String(g.selling_price) : ''
  form.total_stock = g.total_stock != null ? String(g.total_stock) : ''
  form.stock_type = Number(g.stock_type) || 1
  form.valid_type = Number(g.valid_type) || 1
  form.valid_days = g.valid_days != null ? String(g.valid_days || '') : ''
  form.valid_start = g.valid_start || ''
  form.valid_end = g.valid_end || ''
  form.status = Number(g.status) || 0

  // 轮播图：接口返回 JSON 字符串，解析失败则降级为只留主图
  let imgs = []
  if (g.images) {
    try {
      const parsed = JSON.parse(g.images)
      if (Array.isArray(parsed)) imgs = parsed.filter(Boolean)
    } catch (e) {
      imgs = []
    }
  }
  imageList.value = imgs
}

onLoad(async (query) => {
  const q = query || {}
  shopId.value = Number(q.shop_id) || null
  goodsId.value = Number(q.id) || null

  // 未传 shop_id 时，用当前登录商家归属的店铺
  if (!shopId.value) {
    const res = await getShopApplyStatus()
    if (res && res.data) shopId.value = res.data.shop_id || res.data.id || null
  }
  if (!shopId.value) toast('未获取到店铺信息，请返回重试')

  // 编辑模式：拉取商品详情回显（含 SKU / 明细 / 规则 / 票根优惠）
  if (goodsId.value) {
    uni.setNavigationBarTitle({ title: '编辑团购商品' })
    uni.showLoading({ title: '加载中...', mask: true })
    const res = await getShopGoodsDetail({ id: Number(goodsId.value) })
    uni.hideLoading()
    if (res && res.data) {
      applyDetail(res.data)
    } else {
      // H5 下 hideLoading 与 toast 共用实例，延迟弹出避免被吞
      setTimeout(() => {
        uni.showToast({ title: '加载商品信息失败', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1200)
      }, 50)
    }
  }
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

/* ===== 步骤条 ===== */
.stepper {
  flex: none;
  display: flex;
  align-items: flex-start;
  padding: 24rpx 24rpx 20rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .step {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .dot {
      width: 52rpx;
      height: 52rpx;
      line-height: 52rpx;
      text-align: center;
      border-radius: 50%;
      background: #e2e8f0;
      color: #94a3b8;
      font-size: 26rpx;
      font-weight: 700;
      z-index: 2;
      transition: all 0.2s;
    }

    .step-name {
      margin-top: 10rpx;
      font-size: 22rpx;
      color: #94a3b8;
      white-space: nowrap;
    }

    .bar {
      position: absolute;
      top: 25rpx;
      left: 50%;
      width: 100%;
      height: 4rpx;
      background: #e2e8f0;
      z-index: 0;
    }

    .bar.fill {
      background: #2563eb;
    }

    &.active .dot,
    &.done .dot {
      background: #2563eb;
      color: #fff;
    }

    &.active .step-name {
      color: #2563eb;
      font-weight: 700;
    }

    &.done .step-name {
      color: #0f172a;
    }
  }

  .step:last-child .bar {
    display: none;
  }
}

.form-scroll {
  flex: 1;
  /* 关键：flex 子项默认 min-height:auto（=内容高）会阻止自身收缩，
     导致内容过长时 scroll-view 被撑高、无法滚动。置 0 后才拿到确定高度。 */
  min-height: 0;
  box-sizing: border-box;
  padding: 24rpx 24rpx 0;
}

.bottom-gap {
  height: 24rpx;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .card-title {
    display: block;
    font-size: 30rpx;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 20rpx;
  }

  .card-sub {
    font-size: 22rpx;
    font-weight: 600;
    color: #dc2626;
    margin-left: 4rpx;
  }
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;

  .card-title {
    margin-bottom: 0;
  }

  .card-state {
    font-size: 24rpx;
    color: #64748b;

    .chev {
      margin-left: 6rpx;
      display: inline-block;
      color: #94a3b8;
      transition: transform 0.2s;
    }

    .chev.up {
      transform: rotate(180deg);
    }
  }
}

.more-tip {
  background: #eff6ff;
  border-radius: 16rpx;
  padding: 18rpx 20rpx;
  margin-bottom: 24rpx;

  .more-tip-text {
    font-size: 24rpx;
    color: #2563eb;
    line-height: 1.5;
  }
}

.hint {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 12rpx;
  padding: 14rpx 18rpx;
  line-height: 1.5;
}

.add-line {
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border: 2rpx dashed #93c5fd;
  border-radius: 12rpx;
  color: #2563eb;
  font-size: 26rpx;
  font-weight: 700;
  background: #f8fbff;
  margin-bottom: 8rpx;
}

.field {
  margin-bottom: 24rpx;

  .label {
    display: block;
    font-size: 24rpx;
    color: #475569;
    margin-bottom: 12rpx;
    font-weight: 600;
  }

  .required::after {
    content: ' *';
    color: #dc2626;
  }

  .input {
    height: 80rpx;
    box-sizing: border-box;
    padding: 0 20rpx;
    background: #f8fafc;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #0f172a;
  }

  /* 标题 / 副标题：多行输入，高度随内容自适应 */
  .textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 80rpx;
    padding: 18rpx 20rpx;
    background: #f8fafc;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #0f172a;
    line-height: 1.5;
  }

  .ph {
    color: #94a3b8;
  }

  .picker-value {
    height: 80rpx;
    line-height: 80rpx;
    box-sizing: border-box;
    padding: 0 20rpx;
    background: #f8fafc;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #0f172a;
  }
}

.field-row {
  display: flex;

  .flex1 {
    flex: 1;
    min-width: 0;
  }

  .flex1 + .flex1 {
    margin-left: 16rpx;
  }
}

/* 图片上传 */
.img-row {
  display: flex;
  flex-wrap: wrap;
}

.thumb-wrap {
  position: relative;
  margin: 0 16rpx 16rpx 0;

  .thumb {
    width: 140rpx;
    height: 140rpx;
    border-radius: 12rpx;
    background: #e2e8f0;
    display: block;
  }

  .thumb-del {
    position: absolute;
    top: -8rpx;
    right: -8rpx;
    width: 40rpx;
    height: 40rpx;
    line-height: 36rpx;
    text-align: center;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.7);
    color: #fff;
    font-size: 24rpx;
  }
}

.upload-btn {
  width: 140rpx;
  height: 140rpx;
  line-height: 140rpx;
  text-align: center;
  border: 2rpx dashed #cbd5e1;
  border-radius: 12rpx;
  color: #94a3b8;
  font-size: 24rpx;
  background: #f8fafc;
}

/* SKU / 明细子块 */
.sub-block {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 20rpx 20rpx 4rpx;
  margin-bottom: 20rpx;

  .sub-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12rpx;

    .sub-title {
      font-size: 26rpx;
      font-weight: 700;
      color: #0f172a;
    }

    .sub-del {
      font-size: 24rpx;
      color: #dc2626;
    }
  }
}

.empty-tip {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  padding: 8rpx 0 16rpx;
}

/* ===== 底部固定操作栏 ===== */
.footer {
  flex: none;
  display: flex;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);

  .btn {
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 18rpx;
    font-size: 30rpx;
    font-weight: 800;
    margin: 0;

    &::after {
      border: none;
    }
  }

  .ghost {
    flex: 1;
    background: #f1f5f9;
    color: #475569;
    margin-right: 20rpx;
  }

  .primary {
    flex: 2;
    background: #2563eb;
    color: #fff;

    &[disabled] {
      opacity: 0.6;
    }
  }
}

/* ===== 日历价格 ===== */
.batch-box {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 20rpx 20rpx 4rpx;
  margin-bottom: 20rpx;

  .batch-btn-wrap {
    display: flex;
    align-items: flex-end;
  }

  .batch-btn {
    width: 100%;
    height: 80rpx;
    line-height: 80rpx;
    text-align: center;
    border-radius: 12rpx;
    background: #2563eb;
    color: #fff;
    font-size: 26rpx;
    font-weight: 700;
  }

  .batch-tip {
    display: block;
    font-size: 22rpx;
    color: #94a3b8;
    padding: 4rpx 0 16rpx;
    line-height: 1.5;
  }
}

.cal-list {
  max-height: 640rpx;
  overflow-y: auto;
  margin-top: 4rpx;

  .cal-row {
    display: flex;
    align-items: center;
    padding: 12rpx 0;
    border-bottom: 1rpx solid #f1f5f9;

    .cal-date {
      width: 176rpx;
      flex-shrink: 0;

      .cal-d {
        display: block;
        font-size: 24rpx;
        color: #0f172a;
        font-weight: 600;
      }

      .cal-week {
        display: block;
        font-size: 20rpx;
        color: #94a3b8;
      }
    }

    .cal-input {
      flex: 1;
      min-width: 0;
      height: 64rpx;
      line-height: 64rpx;
      margin: 0 8rpx;
      padding: 0 12rpx;
      background: #f8fafc;
      border-radius: 10rpx;
      font-size: 24rpx;
      color: #0f172a;
      box-sizing: border-box;
    }

    .cal-status {
      flex-shrink: 0;
      width: 84rpx;
      height: 52rpx;
      line-height: 52rpx;
      text-align: center;
      border-radius: 999rpx;
      font-size: 22rpx;
      font-weight: 700;
      color: #15803d;
      background: #dcfce7;

      &.off {
        color: #64748b;
        background: #f1f5f9;
      }
    }

    .cal-del {
      flex-shrink: 0;
      margin-left: 12rpx;
      font-size: 26rpx;
      color: #cbd5e1;
    }
  }

  .cal-clear {
    display: block;
    text-align: center;
    font-size: 24rpx;
    color: #dc2626;
    padding: 20rpx 0;
  }
}
</style>
