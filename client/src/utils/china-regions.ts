import type { SpotRegionItem } from '@/api/spots';

export const STANDARD_PROVINCES = [
  '北京市',
  '天津市',
  '河北省',
  '山西省',
  '内蒙古自治区',
  '辽宁省',
  '吉林省',
  '黑龙江省',
  '上海市',
  '江苏省',
  '浙江省',
  '安徽省',
  '福建省',
  '江西省',
  '山东省',
  '河南省',
  '湖北省',
  '湖南省',
  '广东省',
  '广西壮族自治区',
  '海南省',
  '重庆市',
  '四川省',
  '贵州省',
  '云南省',
  '西藏自治区',
  '陕西省',
  '甘肃省',
  '青海省',
  '宁夏回族自治区',
  '新疆维吾尔自治区',
  '香港特别行政区',
  '澳门特别行政区',
  '台湾省',
] as const;

const PROVINCE_ALIAS_MAP: Record<string, string> = {
  北京: '北京市',
  北京市: '北京市',
  天津: '天津市',
  天津市: '天津市',
  河北: '河北省',
  河北省: '河北省',
  山西: '山西省',
  山西省: '山西省',
  内蒙古: '内蒙古自治区',
  内蒙古自治区: '内蒙古自治区',
  辽宁: '辽宁省',
  辽宁省: '辽宁省',
  吉林: '吉林省',
  吉林省: '吉林省',
  黑龙江: '黑龙江省',
  黑龍江省: '黑龙江省',
  黑龙江省: '黑龙江省',
  上海: '上海市',
  上海市: '上海市',
  江苏: '江苏省',
  江苏省: '江苏省',
  浙江: '浙江省',
  浙江省: '浙江省',
  安徽: '安徽省',
  安徽省: '安徽省',
  福建: '福建省',
  福建省: '福建省',
  江西: '江西省',
  江西省: '江西省',
  山东: '山东省',
  山东省: '山东省',
  河南: '河南省',
  河南省: '河南省',
  湖北: '湖北省',
  湖北省: '湖北省',
  湖南: '湖南省',
  湖南省: '湖南省',
  广东: '广东省',
  广东省: '广东省',
  广西: '广西壮族自治区',
  广西壮族自治区: '广西壮族自治区',
  海南: '海南省',
  海南省: '海南省',
  重庆: '重庆市',
  重庆市: '重庆市',
  四川: '四川省',
  四川省: '四川省',
  贵州: '贵州省',
  贵州省: '贵州省',
  云南: '云南省',
  云南省: '云南省',
  西藏: '西藏自治区',
  西藏自治区: '西藏自治区',
  陕西: '陕西省',
  陝西省: '陕西省',
  陕西省: '陕西省',
  甘肃: '甘肃省',
  甘肃省: '甘肃省',
  青海: '青海省',
  青海省: '青海省',
  宁夏: '宁夏回族自治区',
  宁夏回族自治区: '宁夏回族自治区',
  新疆: '新疆维吾尔自治区',
  新疆维吾尔自治区: '新疆维吾尔自治区',
  香港: '香港特别行政区',
  香港特别行政区: '香港特别行政区',
  澳门: '澳门特别行政区',
  澳門特別行政區: '澳门特别行政区',
  澳门特别行政区: '澳门特别行政区',
  台湾: '台湾省',
  臺灣省: '台湾省',
  台湾省: '台湾省',
};

const MUNICIPALITIES = new Set([
  '北京市',
  '天津市',
  '上海市',
  '重庆市',
  '香港特别行政区',
  '澳门特别行政区',
]);

export function normalizeProvinceName(value?: string | null) {
  const text = String(value || '').trim();
  if (!text) return '';
  return PROVINCE_ALIAS_MAP[text] || text;
}

export function normalizeCityName(value?: string | null, province?: string | null) {
  const text = String(value || '').trim();
  const normalizedProvince = normalizeProvinceName(province);
  if (MUNICIPALITIES.has(normalizedProvince)) {
    return normalizedProvince;
  }
  if (!text) return '';
  if (normalizedProvince === '台湾省' && ['台北', '臺北', '台北市', '臺北市'].includes(text)) {
    return '台北市';
  }
  return text;
}

export function normalizeRegionSelection(region: { province?: string | null; city?: string | null }) {
  const province = normalizeProvinceName(region.province);
  const city = normalizeCityName(region.city, province);
  return { province, city };
}

export function buildStandardRegionOptions(rawItems: SpotRegionItem[] = []) {
  const provinceMap = new Map<string, Set<string>>();

  STANDARD_PROVINCES.forEach((province) => {
    provinceMap.set(province, new Set<string>());
  });

  rawItems.forEach((item) => {
    const province = normalizeProvinceName(item.province);
    if (!province) return;
    if (!provinceMap.has(province)) {
      provinceMap.set(province, new Set<string>());
    }
    (item.cities || []).forEach((city) => {
      const normalizedCity = normalizeCityName(city, province);
      if (normalizedCity) {
        provinceMap.get(province)!.add(normalizedCity);
      }
    });
  });

  MUNICIPALITIES.forEach((province) => {
    if (provinceMap.has(province)) {
      provinceMap.get(province)!.add(province);
    }
  });

  return Array.from(provinceMap.entries()).map(([province, cities]) => ({
    province,
    cities: Array.from(cities).sort((a, b) => a.localeCompare(b, 'zh-CN')),
  }));
}
