export interface FisheryContact {
  id: string;
  label: string;
  phone: string;
  scope: string;
  description: string;
  urgent?: boolean;
}

export interface FisheryReportContext {
  name?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

function cleanText(value?: string | null) {
  return String(value || '').trim();
}

export function buildFisheryRegionText(region: { province?: string | null; city?: string | null; district?: string | null }) {
  const parts = [region.province, region.city, region.district]
    .map(cleanText)
    .filter(Boolean);
  return parts.length ? Array.from(new Set(parts)).join(' · ') : '当地';
}

export function getFisheryContacts(region: { province?: string | null; city?: string | null; district?: string | null }): FisheryContact[] {
  const regionText = buildFisheryRegionText(region);

  return [
    {
      id: 'local-government-hotline',
      label: `${regionText}渔政执法转接`,
      phone: '12345',
      scope: regionText,
      description: '发现电鱼、毒鱼、炸鱼、禁渔期捕捞等线索时，可说明位置并要求转当地渔政或农业农村部门。',
    },
    {
      id: 'agriculture-service',
      label: '农业农村服务热线',
      phone: '12316',
      scope: regionText,
      description: '用于农业农村相关咨询、举报与转办，部分地区会按所在地接入。',
    },
    {
      id: 'water-rescue',
      label: '水上遇险求救',
      phone: '12395',
      scope: '全国',
      description: '遇到落水、船只险情、航行遇险等水上紧急情况时使用。',
      urgent: true,
    },
  ];
}

function formatCoord(value?: number | string | null) {
  const next = Number(value);
  return Number.isFinite(next) ? next.toFixed(6) : '';
}

export function buildFisheryReportText(context: FisheryReportContext) {
  const name = cleanText(context.name) || '当前位置';
  const region = buildFisheryRegionText(context);
  const address = cleanText(context.address);
  const lat = formatCoord(context.latitude);
  const lng = formatCoord(context.longitude);
  const locationParts = [
    region && region !== '当地' ? region : '',
    address,
  ].filter(Boolean);
  const locationText = locationParts.length ? locationParts.join(' ') : name;
  const coordText = lat && lng ? `，坐标：${lat}, ${lng}` : '';

  return `我在【${name}】附近，看到疑似电鱼、网鱼等违法捕捞行为。位置是：${locationText}${coordText}。请安排相关部门处理。`;
}
