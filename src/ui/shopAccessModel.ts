import type { ShopAccess } from './shopDestinationModel';

export type ShopAccessTone = 'home' | 'side' | 'secret' | 'away';

export interface ShopAccessModel {
  label: string;
  detail: string;
  tone: ShopAccessTone;
  title: string;
}

export function buildShopAccessModel(shop: ShopAccess): ShopAccessModel {
  if (shop === 'home') {
    return {
      label: '基地商店',
      detail: '全商品购买 · 可取储藏',
      tone: 'home',
      title: 'Home shop: full catalog and stash access',
    };
  }
  if (shop === 'side') {
    return {
      label: '边路商店',
      detail: '只售补给/鞋/小件 · 不送储藏',
      tone: 'side',
      title: 'Side shop: lane utility basics only',
    };
  }
  if (shop === 'secret') {
    return {
      label: '秘密商店',
      detail: '秘店组件 · 满包不暂存',
      tone: 'secret',
      title: 'Secret shop: secret components only',
    };
  }
  return {
    label: '远程浏览',
    detail: '可查看/预购 · 购买需进商店范围',
    tone: 'away',
    title: 'Remote browsing: move into a shop to buy',
  };
}
