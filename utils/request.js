// utils/request.js
// 统一请求工具：错误提示已内置，页面无需再写 try/catch
//
// 约定：
// - 业务成功 (code === 200): resolve 完整响应体 { code, data, msg }
// - 业务失败 / 网络失败:     自动 toast 错误信息，resolve null（不会 reject）
// - 探测类接口（失败不该弹窗的）：在 api 层传 options.silent: true
//
// 页面标准用法：
//   import { get, post } from '@/utils/request.js'
//   const res = await get('/user/profile')                    // GET 请求
//   const res = await post('/user/shop/coupon/add', data)     // POST 请求
//   const res = await post(url, data, { header, silent: true }) // 第三个参数透传请求选项
//   if (!res) return          // 失败已被统一提示，直接返回
//   const { data } = res       // 成功取数据

// 所有接口（含 uni.uploadFile 上传）的统一后端地址，改这一处即可全局切换
// export const baseURL = 'http://192.168.0.114:8081/api'
// export const baseURL = 'https://wx.chenpecloud.com/api'
export const baseURL = 'https://api.chenpecloud.com/api'
// export const baseURL = 'http://localhost:8081/api'

// 核心请求方法：options 兼容 { url, method, data, header, silent, ... }
// 后端错误信息字段不统一：有时返回 msg、有时返回 message，个别接口用 error。
// 统一在这里兼容，新增字段只需改这一处。
// @param {Object} body 响应体（或 null）
// @param {String} fallback 兜底文案
export function pickErrMsg(body, fallback = '') {
  const b = body || {}
  return b.msg || b.message || b.error || fallback
}

// 最近一次「业务失败」的响应体。
// 背景：请求失败时本工具统一 toast 后 resolve(null)，页面拿不到后端自定义的 message；
// 少数场景（如核销结果卡）需要把后端 message 展示在页面上，可通过 takeLastErrorBody() 读取。
// 注意：仅供「单次请求后立即读取」使用，不要跨请求依赖。
let lastErrorBody = null
export function takeLastErrorBody() {
  const b = lastErrorBody
  lastErrorBody = null
  return b
}

export function request(options) {
  const url = options.url || ''
  const finalUrl = baseURL + (url.startsWith('/') ? url : '/' + url)

  return new Promise((resolve) => {
    uni.request({
      url: finalUrl,
      method: options.method || 'GET',
      header: options.header || {},
      data: options.data || options.params,
      // 接口无响应兜底：超时按网络失败处理（走 fail 分支，toast + resolve null），
      // 避免请求永久挂起导致页面 loading 卡死；单个接口可传 options.timeout 覆盖
      timeout: options.timeout || 20000,
      success: (res) => {
        const body = res.data
        if (body && body.code === 200) {
          lastErrorBody = null
          resolve(body)
          return
        }
        const msg = pickErrMsg(body, '请求失败')
        // 记录失败响应体，供需要展示后端 message 的页面读取
        lastErrorBody = body || null
        // 登录失效：清本地凭证并回首页唤起登录弹窗
        if ((body && Number(body.code) === 401) || res.statusCode === 401) {
          handleUnauthorized(msg)
          resolve(null)
          return
        }
        showError(options, msg)
        resolve(null)
      },
      fail: () => {
        lastErrorBody = null
        showError(options, '网络异常，请稍后重试')
        resolve(null)
      }
    })
  })
}

// 登录失效统一处理：清除本地凭证 → 回首页由首页弹出登录框
// 多个并发请求同时 401 时只跳转一次
let redirectingLogin = false
function handleUnauthorized(msg) {
  if (redirectingLogin) return
  redirectingLogin = true
  uni.removeStorageSync('pgtoken')
  // 首页读取该标记后自动打开登录弹窗
  uni.setStorageSync('NEED_LOGIN', 1)
  uni.showToast({ title: msg || '登录已失效，请重新登录', icon: 'none' })
  setTimeout(() => {
    uni.reLaunch({
      url: '/pages/index/index',
      complete: () => {
        // 跳转完成后释放，避免旧页面残留请求再次触发
        setTimeout(() => {
          redirectingLogin = false
        }, 1000)
      }
    })
  }, 600)
}

// POST 请求便捷方法
// @param {String} url      接口路径，如 '/send-sms'
// @param {Object} data     请求体参数
// @param {Object} options  透传请求选项（header / silent 等）
export function post(url = '', data = {}, options = {}) {
  return request({
    method: 'POST',
    url: url,
    data: data,
    ...options
  })
}

// GET 请求便捷方法（data 会自动拼为查询参数）
// @param {String} url      接口路径，如 '/cities-by-pid'
// @param {Object} data     查询参数
// @param {Object} options  透传请求选项（header / silent 等）
export function get(url = '', data = {}, options = {}) {
  return request({
    method: 'GET',
    url: url,
    data: data,
    ...options
  })
}

// 统一错误提示（options.silent: true 时不弹）
// 延迟弹出：避免被页面里 await 之后紧跟的 uni.hideLoading() 关掉（H5 下二者共享同一实例）
function showError(options, msg) {
  if (options.silent) return
  setTimeout(() => {
    uni.showToast({ title: msg, icon: 'none' })
  }, 50)
}

export default { request, get, post }
