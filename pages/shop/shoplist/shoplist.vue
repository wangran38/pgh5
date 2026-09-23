<template>
	<view class="page">
		<!-- 搜索栏（固定） -->
		<view class="search-card">
			<view class="search-box">
				<text class="search-icon">🔍</text>
				<input
					v-model="keyword"
					class="search-input"
					:placeholder="categoryName ? `在「${categoryName}」中搜索` : '搜索商家 / 地点'"
					placeholder-class="search-ph"
					confirm-type="search"
					@confirm="doSearch"
				/>
				<text v-if="keyword" class="search-clear" @click="clearSearch">✕</text>
			</view>
			<text class="search-btn" @click="doSearch">搜索</text>
		</view>

		<!-- 当前筛选标签 + 附近半径 + 排序 -->
		<view class="filter-bar">
			<view class="filter-left">
				<text class="filter-tag" v-if="categoryName">{{ categoryName }}</text>
				<text class="filter-count">{{ loading ? '加载中…' : `共 ${displayList.length} 家` }}</text>
			</view>

			<view class="filter-right">
				<!-- 附近半径：仅在「距离最近」排序下显示，由后端 radius_km 筛选 -->
				<view v-if="sortType === 'distance'" class="sort-wrap">
					<view class="sort-btn" @click.stop="toggleMenu('radius')">
						<text class="sort-btn-text">{{ currentRadiusLabel }}</text>
						<text class="sort-arrow">{{ openMenu === 'radius' ? '▲' : '▼' }}</text>
					</view>
					<view v-if="openMenu === 'radius'" class="sort-menu">
						<view
							v-for="opt in radiusOptions"
							:key="String(opt.value)"
							class="sort-item"
							:class="{ on: radiusKm === opt.value }"
							@click.stop="pickRadius(opt)"
						>
							<text class="sort-item-text">{{ opt.label }}</text>
							<text v-if="radiusKm === opt.value" class="sort-check">✓</text>
						</view>
					</view>
				</view>

				<!-- 排序：客户端排序 -->
				<view class="sort-wrap">
					<view class="sort-btn" @click.stop="toggleMenu('sort')">
						<text class="sort-btn-text">{{ currentSortLabel }}</text>
						<text class="sort-arrow">{{ openMenu === 'sort' ? '▲' : '▼' }}</text>
					</view>
					<view v-if="openMenu === 'sort'" class="sort-menu">
						<view
							v-for="opt in sortOptions"
							:key="String(opt.value)"
							class="sort-item"
							:class="{ on: sortType === opt.value }"
							@click.stop="pickSort(opt)"
						>
							<text class="sort-item-text">{{ opt.label }}</text>
							<text v-if="sortType === opt.value" class="sort-check">✓</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 商家列表：内容排满才可滚 -->
		<scroll-view class="list-scroll" scroll-y refresher-enabled
			:refresher-triggered="refreshing" refresher-default-style="black" @refresherrefresh="onRefresh">
			<view v-if="loading && shopList.length === 0" class="state-text">商家加载中...</view>
			<view v-else-if="shopList.length === 0" class="state-text">该分类下暂无商家</view>

			<view v-else v-for="shop in displayList" :key="shop.id" class="shop-card" @click="openShop(shop)">
				<view class="shop-cover"
					:style="{ background: shop.themeColor || 'linear-gradient(135deg, #2563eb, #1d4ed8)' }">
					<image v-if="shop.logo" class="cover-img" :src="firstImage(shop.logo)" mode="aspectFill" />
					<text class="cover-badge">{{ shop.status === 1 ? '营业中' : '休息中' }}</text>
					<text class="cover-title">{{ shop.name || '特惠商家' }}</text>
				</view>

				<view class="shop-body">
					<view class="shop-header">
						<text class="shop-name">{{ shop.name || '精选商户' }}</text>
						<text class="shop-dist" v-if="shop.distance_km != null && shop.distance_km !== ''">{{ formatDistance(shop.distance_km) }}</text>
					</view>

					<view class="benefit-box" v-if="shop.discounts">
						<text class="benefit-label">票根立减</text>
						<text class="benefit-val">{{ shop.discounts }}</text>
					</view>

					<view class="shop-footer">
						<text class="category-tag">{{ shop.address || '综合特惠' }}</text>
						<text class="price-wrap" v-if="shop.avg_cost > 0">
							<text class="symbol">￥</text>
							<text class="amount">{{ shop.avg_cost }}</text>
							<text class="unit">人均</text>
						</text>
					</view>
				</view>
			</view>

			<view class="bottom-padding"></view>
		</scroll-view>

		<!-- 下拉菜单遮罩：点击空白处收起 -->
		<view v-if="openMenu" class="sort-mask" @click="closeMenus"></view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getShopList } from '@/api/shop.js'
import { getGpsPosition } from '@/utils/location.js'

const categoryId = ref(0)
const categoryName = ref('')
const keyword = ref('')
const shopList = ref([])
const loading = ref(false)
const refreshing = ref(false)

// 排序：'' 综合（后端原序） / 'distance' 距离最近 / 'priceAsc' 低价 / 'priceDesc' 高价
// ⚠️ /shops 接口无排序参数，故全部走客户端排序（本页为一次性拉取，非分页故可行）
const sortOptions = [
	{ label: '综合排序', value: '' },
	{ label: '距离', value: 'distance' },
	{ label: '低价优先', value: 'priceAsc' },
	{ label: '高价优先', value: 'priceDesc' }
]
const sortType = ref('')
// 当前展开的下拉：'' 无 / 'sort' 排序 / 'radius' 附近半径（同时只允许展开一个）
const openMenu = ref('')

// 附近半径：0 不限；其余为后端 radius_km（单位公里）
const radiusOptions = [
	{ label: '附近不限', value: 0 },
	{ label: '附近 5 公里', value: 5 },
	{ label: '附近 10 公里', value: 10 },
	{ label: '附近 20 公里', value: 20 },
	{ label: '附近 30 公里', value: 30 }
]
const radiusKm = ref(0)

const currentSortLabel = computed(() => {
	const hit = sortOptions.find((o) => o.value === sortType.value)
	return hit ? hit.label : '综合排序'
})

const currentRadiusLabel = computed(() => {
	const hit = radiusOptions.find((o) => o.value === radiusKm.value)
	return hit ? hit.label : '附近不限'
})

function toggleMenu(key) {
	openMenu.value = openMenu.value === key ? '' : key
}

function closeMenus() {
	openMenu.value = ''
}

function pickSort(opt) {
	sortType.value = opt.value
	openMenu.value = ''
	// 切离「距离最近」时清掉附近半径并重拉，避免残留半径影响其它排序结果
	if (sortType.value !== 'distance' && radiusKm.value > 0) {
		radiusKm.value = 0
		loadShops()
	}
}

// 半径是服务端筛选参数，选中后需要重新请求列表
function pickRadius(opt) {
	if (radiusKm.value === opt.value) {
		openMenu.value = ''
		return
	}
	radiusKm.value = opt.value
	openMenu.value = ''
	loadShops()
}

// 距离值：未传经纬度时后端不返回 distance_km（null/''），这类商家排到最后
function distVal(s) {
	if (s == null || s === '') return Infinity
	const v = Number(s)
	if (isNaN(v)) return Infinity
	return v
}

// 人均值为空或 0 视为「未设置」，无论升/降序一律排到最后
function priceUnknown(v) {
	return v == null || v === '' || isNaN(Number(v)) || Number(v) === 0
}

const displayList = computed(() => {
	const arr = [...shopList.value]
	const t = sortType.value
	if (!t) return arr

	if (t === 'distance') {
		return arr.sort((a, b) => distVal(a.distance_km) - distVal(b.distance_km))
	}

	// 低价优先 / 高价优先：未知值恒排末尾，仅在已知值之间比较
	const asc = t === 'priceAsc'
	return arr.sort((a, b) => {
		const ua = priceUnknown(a.avg_cost)
		const ub = priceUnknown(b.avg_cost)
		if (ua && ub) return 0
		if (ua) return 1
		if (ub) return -1
		return asc
			? Number(a.avg_cost) - Number(b.avg_cost)
			: Number(b.avg_cost) - Number(a.avg_cost)
	})
})

function extractListData(res) {
	if (!res) return []
	if (Array.isArray(res)) return res
	if (Array.isArray(res.data)) return res.data
	if (Array.isArray(res.list)) return res.list
	if (res.data && Array.isArray(res.data.list)) return res.data.list
	return []
}

function firstImage(str) {
	return String(str || '').split(',')[0].trim()
}

function formatDistance(km) {
	const n = Number(km)
	if (isNaN(n)) return ''
	return n < 1 ? `${Math.round(n * 1000)}m` : `${n.toFixed(1)}km`
}

// 定位成功后缓存（位置短时间不会变，多页复用可避免反复授权授权/超时失败）
const userPosition = ref(null)
const POSITION_KEY = 'user_position'

function readCachedPosition() {
	try {
		const p = uni.getStorageSync(POSITION_KEY)
		if (p && p.longitude != null && p.latitude != null) return p
	} catch (e) {
		console.warn('读取缓存定位失败:', e)
	}
	return null
}

async function ensureUserPosition() {
	if (userPosition.value) return userPosition.value
	const cached = readCachedPosition()
	if (cached) {
		userPosition.value = cached
		return cached
	}
	const pos = await getGpsPosition().catch(() => null)
	if (pos) {
		userPosition.value = pos
		try {
			uni.setStorageSync(POSITION_KEY, pos)
		} catch (e) {
			console.warn('缓存定位失败:', e)
		}
	}
	return pos
}

async function loadShops() {
	if (!loading.value) loading.value = true
	try {
		// 定位失败静默兜底：列表仍展示，只是不带距离
		const pos = await ensureUserPosition()
		// ⚠️ 按 /api/shops 文档：category_id、city_id 为必传；city_id 取自右上角选城市时缓存
		const params = {
			category_id: categoryId.value ? Number(categoryId.value) : 0,
			city_id: Number(uni.getStorageSync('city_id') || 0)
		}
		// ⚠️ 搜索字段按文档为 name（商家名称模糊搜索）
		if (keyword.value.trim()) params.name = keyword.value.trim()
		if (pos) {
			params.user_lng = pos.longitude
			params.user_lat = pos.latitude
			// radius_km 依赖经纬度，后端据此筛选半径内商家
			if (radiusKm.value > 0) params.radius_km = radiusKm.value
		} else if (radiusKm.value > 0) {
			// 未拿到定位时 radius_km 无法生效，给出提示避免用户误以为筛选没用
			uni.showToast({ title: '未获取到定位，附近筛选暂不可用', icon: 'none' })
		}
		// 调试用：对接口时可直接在控制台核对实际请求参数
		console.log('[shoplist] 请求参数:', params)
		const res = await getShopList(params)
		const list = extractListData(res)
		// ⚠️ 兜底：若后端商家数据的 city_id 与所选城市对不上，会返回空列表；
		//    此时退回「不限城市」重查一次（与首页同样不按城市筛选），避免用户看到空白页。
		//    待后端 city_id 数据校准后可删除本段。
		if (!list.length && Number(params.city_id) > 0) {
			const retryRes = await getShopList({ ...params, city_id: 0 })
			shopList.value = extractListData(retryRes)
			console.warn(
				'[shoplist] city_id 无结果，已退回不限城市：',
				params.city_id,
				'→',
				shopList.value.length
			)
		} else {
			shopList.value = list
		}
	} catch (e) {
		// 异常兜底：不让 loading 卡死，回退空态（提示已由 request.js 统一给出）
		console.error('商家列表加载异常:', e)
		shopList.value = []
	} finally {
		loading.value = false
		refreshing.value = false
	}
}

async function onRefresh() {
	refreshing.value = true
	await loadShops()
}

function doSearch() {
	loadShops()
}

function clearSearch() {
	keyword.value = ''
	loadShops()
}

function openShop(shop) {
	if (!shop || !shop.id) return
	const name = encodeURIComponent(shop.name || shop.short_name || '')
	const logo = encodeURIComponent(shop.logo || '')
	uni.navigateTo({
		url: `/pages/shop/detail/detail?shop_id=${shop.id}&name=${name}&logo=${logo}`
	})
}

onLoad((query) => {
	categoryId.value = Number(query && query.category_id) || 0
	categoryName.value = (query && query.name ? decodeURIComponent(query.name) : '') || ''
	// 标题随分类变化（默认导航栏）
	uni.setNavigationBarTitle({
		title: categoryName.value ? `${categoryName.value} · 好店` : '好店列表'
	})
	loadShops()
})
</script>

<style lang="scss" scoped>
.page {
	position: fixed;
	top: var(--window-top, 0);
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: #f8fafc;
	padding: 20rpx 28rpx;
	box-sizing: border-box;
}

/* 搜索栏 */
.search-card {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	background: #fff;
	border-radius: 24rpx;
	padding: 16rpx 20rpx;
	margin-bottom: 16rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

	.search-box {
		flex: 1;
		display: flex;
		align-items: center;
		background: #f8fafc;
		border-radius: 16rpx;
		padding: 0 20rpx;
		height: 72rpx;

		.search-icon {
			font-size: 24rpx;
			margin-right: 12rpx;
			opacity: 0.7;
		}

		.search-input {
			flex: 1;
			font-size: 26rpx;
			color: #0f172a;
		}

		.search-ph {
			color: #94a3b8;
		}

		.search-clear {
			font-size: 24rpx;
			color: #cbd5e1;
			padding: 4rpx 0 4rpx 12rpx;
		}
	}

	.search-btn {
		flex-shrink: 0;
		margin-left: 16rpx;
		height: 64rpx;
		line-height: 64rpx;
		padding: 0 26rpx;
		border-radius: 16rpx;
		background: #2563eb;
		color: #fff;
		font-size: 26rpx;
		font-weight: 700;
	}
}

/* 筛选标签条 */
.filter-bar {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;

	.filter-left {
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
	}

	.filter-right {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.sort-wrap {
		position: relative;
		flex-shrink: 0;
		z-index: 20;
	}

	.sort-btn {
		display: flex;
		align-items: center;
		background: #fff;
		border: 1rpx solid #e2e8f0;
		border-radius: 999rpx;
		padding: 10rpx 22rpx;

		.sort-btn-text {
			font-size: 22rpx;
			font-weight: 700;
			color: #1e40af;
		}

		.sort-arrow {
			font-size: 16rpx;
			color: #2563eb;
			margin-left: 8rpx;
		}
	}

	.sort-menu {
		position: absolute;
		top: calc(100% + 8rpx);
		right: 0;
		min-width: 200rpx;
		background: #fff;
		border-radius: 16rpx;
		border: 1rpx solid #e2e8f0;
		box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.12);
		overflow: hidden;
	}

	.sort-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 24rpx;

		& + .sort-item {
			border-top: 1rpx solid #f1f5f9;
		}

		.sort-item-text {
			font-size: 24rpx;
			color: #334155;
		}

		&.on {
			.sort-item-text {
				color: #1d4ed8;
				font-weight: 800;
			}

			.sort-check {
				font-size: 22rpx;
				color: #1d4ed8;
				margin-left: 16rpx;
			}
		}
	}

	.filter-tag {
		font-size: 22rpx;
		font-weight: 800;
		color: #1d4ed8;
		background: #eff6ff;
		border: 1rpx solid #93c5fd;
		padding: 6rpx 18rpx;
		border-radius: 999rpx;
		margin-right: 16rpx;
	}

	.filter-count {
		font-size: 22rpx;
		color: #94a3b8;
	}
}

/* 列表滚动区 */
.list-scroll {
	flex: 1;
	min-height: 0;
	height: 0;
	overscroll-behavior: none;
}

.state-text {
	text-align: center;
	color: #94a3b8;
	font-size: 26rpx;
	padding: 120rpx 0;
}

/* 商家卡片（与首页一致） */
.shop-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 20rpx;
	margin-bottom: 20rpx;
	display: flex;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);

	.shop-cover {
		position: relative;
		overflow: hidden;
		width: 160rpx;
		height: 160rpx;
		border-radius: 14rpx;
		color: #fff;
		padding: 12rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: space-between;

		.cover-img {
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			height: 100%;
			z-index: 0;
		}

		.cover-badge {
			position: relative;
			z-index: 1;
			font-size: 16rpx;
			background: rgba(0, 0, 0, 0.25);
			padding: 2rpx 6rpx;
			border-radius: 4rpx;
			width: fit-content;
		}

		.cover-title {
			position: relative;
			z-index: 1;
			font-size: 22rpx;
			font-weight: 800;
		}
	}

	.shop-body {
		flex: 1;
		margin-left: 20rpx;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-width: 0;
	}

	.shop-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;

		.shop-name {
			font-size: 28rpx;
			font-weight: 600;
			color: #0f172a;
			flex: 1;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.shop-dist {
			font-size: 20rpx;
			color: #94a3b8;
			margin-left: 10rpx;
		}
	}

	.benefit-box {
		display: flex;
		align-items: flex-start;
		background: #fef2f2;
		border: 1rpx solid #fee2e2;
		padding: 6rpx 10rpx;
		border-radius: 8rpx;
		width: fit-content;
		max-width: 100%;
		box-sizing: border-box;
		margin: 8rpx 0;

		.benefit-label {
			font-size: 18rpx;
			font-weight: 800;
			color: #dc2626;
			margin-right: 8rpx;
			flex-shrink: 0;
		}

		.benefit-val {
			font-size: 20rpx;
			font-weight: 700;
			color: #b91c1c;
		}
	}

	.shop-footer {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;

		.category-tag {
			font-size: 20rpx;
			color: #64748b;
			flex: 1;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.price-wrap {
			color: #dc2626;
			font-weight: 800;

			.symbol { font-size: 20rpx; }
			.amount { font-size: 32rpx; }
			.unit {
				font-size: 18rpx;
				color: #94a3b8;
				font-weight: 400;
				margin-left: 2rpx;
			}
		}
	}
}

.bottom-padding {
	height: 60rpx;
}

/* 下拉排序遮罩：置于内容之上、弹层之下 */
.sort-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 10;
}
</style>
