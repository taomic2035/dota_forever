import { describe, expect, it } from 'vitest';
import { buildShopAccessModel } from '../src/ui/shopAccessModel';

describe('buildShopAccessModel', () => {
  it('labels home shop as the full-service base shop', () => {
    expect(buildShopAccessModel('home')).toEqual({
      label: '基地商店',
      detail: '全商品购买 · 可取储藏',
      tone: 'home',
      title: 'Home shop: full catalog and stash access',
    });
  });

  it('explains side-shop limits without implying the hero is out of range', () => {
    expect(buildShopAccessModel('side')).toEqual({
      label: '边路商店',
      detail: '只售补给/鞋/小件 · 不送储藏',
      tone: 'side',
      title: 'Side shop: lane utility basics only',
    });
  });

  it('labels secret shop as component-only special access', () => {
    expect(buildShopAccessModel('secret')).toEqual({
      label: '秘密商店',
      detail: '秘店组件 · 满包不暂存',
      tone: 'secret',
      title: 'Secret shop: secret components only',
    });
  });

  it('keeps out-of-range state explicit', () => {
    expect(buildShopAccessModel(null)).toEqual({
      label: '远程浏览',
      detail: '可查看/预购 · 购买需进商店范围',
      tone: 'away',
      title: 'Remote browsing: move into a shop to buy',
    });
  });
});
