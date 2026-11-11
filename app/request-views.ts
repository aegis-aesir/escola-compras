import type {Purchase} from './model';

export function isVisibleInEstimateView(request:Pick<Purchase,'status'|'estimate'>) {
  return ['estimating','pending'].includes(request.status)||!!request.estimate;
}
