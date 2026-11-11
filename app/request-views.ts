import type {Purchase} from './model';
import type {Member} from './model';

export function isVisibleInEstimateView(request:Pick<Purchase,'status'|'estimate'>) {
  return ['estimating','pending'].includes(request.status)||!!request.estimate;
}

export function isVisibleInApprovalView(request:Pick<Purchase,'status'>,role:Member['role']) {
  if(role==='admin')return ['admin_review','general_review'].includes(request.status);
  if(role==='administrativo')return request.status==='admin_review';
  if(role==='geral')return request.status==='general_review';
  return false;
}
