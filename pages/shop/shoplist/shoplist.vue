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

		<!-- 当前筛选标签 -->
		<view class="filter-bar">
			<text class="filter-tag" v-if="categoryName">{{ categoryName }}</text>
			<text class="filter-count">{{ loading ? '加载中…' : `共 ${shopList.length} 家` }}</text>
		</view>

		<!-- 商家列表：内容排满才可滚 -->
		<scroll-view class="list-scroll" scroll-y refresher-enabled
			:refresher-triggered="refreshing" refresher-default-style="black" @refresherrefresh="onRefresh">
			<view v-if="loading && shopList.length === 0" class="state-text">商家加载中...</view>
			<view v-else-if="shopList.length === 0" class="state-text">该分类下暂无商家</view>

			<view v-else v-for="shop in shopList" :key="shop.id" class="shop-card" @click="openShop(shop)">
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
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getShopList } from '@/api/shop.js'
import { getGpsPosition } from '@/utils/location.js'

const categoryId = ref(0)
const categoryName = ref('')
const keyword = ref('')
const shopList = ref([])
const loading = ref(false)
const refreshing = ref(false)

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

async function loadShops() {
	if (!loading.value) loading.value = true
	try {
		// 定位失败静默兜底：列表仍展示，只是不带距离
		const pos = await getGpsPosition().catch(() => null)
		const params = {}
		if (categoryId.value) params.category_id = Number(categoryId.value)
		// ⚠️ 关键词字段名（keyword）需与后端 /shops 对齐，若后端用其它字段名（如 name）只改这里
		if (keyword.value.trim()) params.keyword = keyword.value.trim()
		if (pos) {
			params.user_lng = pos.longitude
			params.user_lat = pos.latitude
		}
		const res = await getShopList(params)
		shopList.value = extractListData(res)
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
	margin-bottom: 16rpx;

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
</style>
