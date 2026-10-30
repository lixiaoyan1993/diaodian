export const standardTagGroups = [
  { title: '停车交通', items: ['好停车', '停车困难', '需步行'] },
  { title: '设施便利', items: ['有卫生间', '有便利店', '可露营'] },
  { title: '风险提醒', items: ['禁钓风险', '有人管理', '易挂底'] },
  { title: '环境体验', items: ['夜钓友好', '人少安静', '水质好', '适合新手'] },
  { title: '费用相关', items: ['免费', '可能收费'] },
];

export const standardTags = Array.from(new Set(standardTagGroups.flatMap(group => group.items)));

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

export function normalizeSpotTags(tags: string[]) {
  const source = tags.map(tag => tag.trim()).filter(Boolean);
  const normalized = source.flatMap(tag => {
    const matched = standardTags.filter(standard => {
      const words = tagSynonyms[standard] || [standard];
      return words.some(word => tag.includes(word) || word.includes(tag));
    });
    return [tag, ...matched];
  });
  return Array.from(new Set(normalized.map(tag => tag.slice(0, 20)))).slice(0, 12);
}

export function expandTagFilters(tags: string[]) {
  const expanded = tags.flatMap(tag => {
    const value = tag.trim();
    const standard = standardTags.find(item => item === value || (tagSynonyms[item] || []).includes(value));
    return standard ? [standard, ...(tagSynonyms[standard] || [])] : [value];
  });
  return Array.from(new Set(expanded.filter(Boolean)));
}
