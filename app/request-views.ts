import type {Purchase} from './model';
import type {Member} from './model';

export function isVisibleInEstimateView(request:Pick<Purchase,'status'|'estimate'>) {
  return ['estimating','admin_review'].includes(request.status);
}

export function isVisibleInApprovalView(request:Pick<Purchase,'status'>,role:Member['role']) {
  if(role==='admin')return ['admin_review','general_review'].includes(request.status);
  if(role==='administrativo')return ['admin_review','general_review'].includes(request.status);
  if(role==='geral')return request.status==='general_review';
  return false;
}
