/// <reference types="@dcloudio/types" />

import type { SpotItem } from '@/api/spots';
import type { TravelPostItem, TravelType } from '@/api/travel';

export type StandardTagGroup = {
  title: string;
  items: string[];
};

export const standardTagGroups: StandardTagGroup[] = [
  { title: '停车交通', items: ['好停车', '停车困难', '需步行'] },
  { title: '设施便利', items: ['有卫生间', '有便利店', '可露营'] },
  { title: '风险提醒', items: ['禁钓风险', '有人管理', '易挂底'] },
  { title: '环境体验', items: ['夜钓友好', '人少安静', '水质好', '适合新手'] },
  { title: '费用相关', items: ['免费', '可能收费'] },
];

export const standardTags = Array.from(
  new Set(standardTagGroups.reduce<string[]>((acc, group) => acc.concat(group.items), []))
);

export const tagSynonyms: Record<string, string[]> = {
  好停车: ['好停车', '停车方便', '能停车', '有车位', '免费停车', '路边停车', '停车'],
  停车困难: ['停车困难', '不好停车', '停车难', '没车位', '车位少'],
  需步行: ['需步行', '步行', '走路', '车进不去', '不好开车进'],
  有卫生间: ['有卫生间', '卫生间', '厕所', '公厕', '洗手间'],
  有便利店: ['有便利店', '便利店', '小卖部', '超市', '买水'],
  可露营: ['可露营', '露营', '搭帐篷', '帐篷'],
  禁钓风险: ['禁钓风险', '禁钓', '不让钓', '保安赶', '有人赶'],
  有人管理: ['有人管理', '有人管', '管理', '收费员', '保安'],
  易挂底: ['易挂底', '挂底', '地球', '石头多', '水草多', '障碍多'],
  夜钓友好: ['夜钓友好', '夜钓', '晚上能钓', '有路灯'],
  人少安静: ['人少安静', '人少', '安静', '清净'],
  水质好: ['水质好', '水清', '水干净', '清澈'],
  适合新手: ['适合新手', '新手友好', '好上手', '不复杂'],
  免费: ['免费', '不收费', '不要钱', '无费用'],
  可能收费: ['可能收费', '收费', '要钱', '停车收费'],
};

export function normalizeTags(input: string[]) {
  const source = input.map(tag => tag.trim()).filter(Boolean);
  const normalized = source.reduce<string[]>((acc, tag) => {
    const matched = standardTags.filter(standard => {
      const words = tagSynonyms[standard] || [standard];
      return words.some(word => tag.includes(word) || word.includes(tag));
    });
    return acc.concat([tag, ...matched]);
  }, []);
  return Array.from(new Set(normalized)).slice(0, 12);
}

export const fishOptionsByStyle: Record<string, string[]> = {
  '路亚': ['翘嘴', '鳜鱼', '鲈鱼', '黑鱼', '马口', '红尾', '鳡鱼', '鲶鱼'],
  '台钓': ['鲫鱼', '鲤鱼', '草鱼', '青鱼', '鲢鳙', '鳊鱼', '罗非', '黄颡鱼'],
};

export const allFishOptions = Array.from(new Set(Object.values(fishOptionsByStyle).flat()));

export const shareCopy = {
  appTitle: '鱼标点：找钓点、记渔获',
  hallTitle: '鱼标点：发现附近钓点',
  tripEmptyTitle: '鱼标点：一起找钓点、做出行计划',
  spotFallbackTitle: '鱼标点',
  travelHallTitle: '鱼标点行程广场',
  travelDetailFallbackTitle: '鱼标点行程分享',
};

export const sharePath = {
  app: '/pages/hall/hall',
  hall: '/pages/hall/hall',
  trip: '/pages/tools/tools',
  travel: '/pages/travel/travel',
};

export function absoluteShareLink(path: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path}`;
}

export function spotSharePath(spot?: Pick<SpotItem, 'id'> | null) {
  return spot?.id ? `/pages/spot/spot?id=${spot.id}` : sharePath.hall;
}

export function spotShareTitle(spot?: Pick<SpotItem, 'name' | 'species'> | null) {
  if (!spot) return shareCopy.spotFallbackTitle;
  const fish = spot.species ? ` · ${spot.species}` : '';
  return `分享钓点：${spot.name}${fish}`;
}

export function tripShareTitle(items: Array<Pick<SpotItem, 'name'>>) {
  if (!items.length) return shareCopy.tripEmptyTitle;
  return `我的钓鱼出行：${items[0].name}等${items.length}个点`;
}

export function travelTypeShareLabel(value: TravelType) {
  if (value === 'find_car') return '找车';
  if (value === 'carpool') return '拼车';
  return '结伴';
}

export function travelShareTitle(item: Pick<TravelPostItem, 'travelType' | 'user'>) {
  return `${item.user.username}发起了${travelTypeShareLabel(item.travelType)}行程`;
}

export function travelDetailShareTitle(item?: Pick<TravelPostItem, 'travelType' | 'user'> | null) {
  return item
    ? `${item.user.username}发起了钓友${travelTypeShareLabel(item.travelType)}`
    : shareCopy.travelDetailFallbackTitle;
}
