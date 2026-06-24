import { request } from './request'

export function testRetrieval(payload) {
  return request('/admin/retrieval/test', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

