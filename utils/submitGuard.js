import { ref } from 'vue'

/**
 * useSubmit —— 统一防重复提交（提交锁）
 *
 * 用于所有「点击后调用接口」的按钮，解决快速连点导致接口被重复调用的问题。
 *
 * 用法：
 *   const { loading, submit } = useSubmit(async () => {
 *     const res = await someApi(payload)
 *     if (res) { uni.showToast(...); setTimeout(() => uni.navigateBack(), 1200) }
 *   }, { cooldown: 1300 })
 *
 *   模板：<button :disabled="loading" :loading="loading" @click="submit">提交</button>
 *
 * 三重保障：
 *   1. 在途锁：请求返回前，重复点击直接忽略（核心，防止并发重复请求）。
 *   2. 冷却期：请求结束后 cooldown 毫秒内仍忽略点击，覆盖「成功后延迟跳转」的时间窗，
 *      也能吸收请求很快失败时的连续误点。
 *   3. 异常安全：处理函数抛错也能正确释放锁，不会把按钮永久卡死。
 *
 * 约定：
 *   - cooldown 应不小于「成功后跳转」的延时，否则那段窗口仍可能被点第二次。
 *   - 表单校验请放在 submit 之外自行处理（校验不通过时不要调用 submit），
 *     这样校验失败不会占用锁与冷却期，用户可立即修正后重试。
 *
 * @param {Function} handler 提交处理函数（内部调用接口），可返回任意值。
 * @param {Object}   [options]
 * @param {number}   [options.cooldown=800] 请求结束后继续保持禁用的毫秒数。
 * @returns {{ loading: import('vue').Ref<boolean>, submit: (...args: any[]) => Promise<any> }}
 */
export function useSubmit(handler, options = {}) {
  const cooldown = Number(options.cooldown ?? 800)
  const loading = ref(false)
  let busy = false
  let timer = null

  async function submit(...args) {
    if (busy) return
    busy = true
    loading.value = true
    try {
      return await handler(...args)
    } catch (e) {
      // 出错交由 handler 内部处理（request.js 一般不抛错）；此处兜底避免未捕获异常
      return undefined
    } finally {
      clearTimeout(timer)
      timer = setTimeout(() => {
        busy = false
        loading.value = false
      }, cooldown)
    }
  }

  return { loading, submit }
}
