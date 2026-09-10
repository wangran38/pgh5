// api/city.js
// 城市与地区数据接口封装
import { get } from '@/utils/request.js' // 引入统一封装的请求工具

/**
 * 根据父级 pid 获取下级城市/地区数据
 * @param {Object} params - 请求参数
 * @param {number} [params.pid=0] - 父级地区ID，不传或传0表示获取全国省份/直辖市
 * @returns {Promise} 返回后端接口 Response 数据
 */
export function getCitiesByPid(params = { pid: 0 }) {
  return get('/cities-by-pid', {
    pid: params.pid ?? 0
  })
}
