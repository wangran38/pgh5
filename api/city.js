// api/city.js
// 城市与地区数据接口封装
import request from '@/utils/request.js' // 引入统一封装的请求工具

/**
 * 根据父级 pid 获取下级城市/地区数据
 * @param {Object} params - 请求参数
 * @param {number} [params.pid=0] - 父级地区ID，不传或传0表示获取全国省份/直辖市
 * @returns {Promise} 返回后端接口 Response 数据
 */
export function getCitiesByPid(params = { pid: 0 }) {
  return request({
    url: '/cities-by-pid', // 此时会由 request.js 自动拼接 baseURL
    method: 'GET',
    data: {
      pid: params.pid ?? 0
    }
  })
}
