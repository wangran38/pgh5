<template>
	<view v-if="visible" class="sp-mask" @click="onMask">
		<view class="sp-sheet" @click.stop>
			<view class="sp-head">
				<text class="sp-title">{{ title }}</text>
				<text class="sp-close" @click="emit('close')">✕</text>
			</view>
			<!-- 主体：调用方传入任意内容（列表 / 日历 / 表单） -->
			<slot />
			<view v-if="$slots.foot" class="sp-foot">
				<slot name="foot" />
			</view>
		</view>
	</view>
</template>

<script setup>
const props = defineProps({
	visible: { type: Boolean, default: false },
	title: { type: String, default: '' },
	// 点遮罩是否关闭（部分弹层要求必须显式选择，可设为 false）
	closeOnMask: { type: Boolean, default: true }
})
const emit = defineEmits(['close'])

function onMask() {
	if (props.closeOnMask) emit('close')
}
</script>

<style lang="scss" scoped>
/* 底部弹层通用容器：统一各页面的「遮罩 + 圆角面板 + 标题栏 + 底部操作区」 */
.sp-mask {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 999;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: flex-end;
}

.sp-sheet {
	width: 100%;
	background: #fff;
	border-radius: 32rpx 32rpx 0 0;
	padding: 36rpx;
	box-sizing: border-box;
	max-height: 80vh;
	display: flex;
	flex-direction: column;
}

.sp-head {
	flex-shrink: 0;
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
}

.sp-title {
	font-size: 32rpx;
	font-weight: 900;
	color: #0f172a;
}

.sp-close {
	font-size: 32rpx;
	color: #94a3b8;
	padding: 0 10rpx;
}

.sp-foot {
	flex-shrink: 0;
	margin-top: 20rpx;
}
</style>
