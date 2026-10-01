// 物理计算独立于渲染；SI 单位只用于有量纲的读数。
export const C = 299792458;
export const G = 6.67430e-11;
export const SOLAR_MASS = 1.98847e30;
export const SOLAR_RADIUS = 6.957e8;

export function gamma(beta) {
  if (!Number.isFinite(beta) || Math.abs(beta) >= 1) throw new RangeError('|v/c| must be < 1');
  return 1 / Math.sqrt(1 - beta * beta);
}

export function energy(mass, beta) {
  if (!Number.isFinite(mass) || mass < 0) throw new RangeError('Mass must be nonnegative');
  const rest = mass * C ** 2;
  const total = gamma(beta) * rest;
  return { rest, total, kinetic: total - rest };
}

// 仅用于平直时空，坐标采用 c = 1；输入 t 表示 ct 的数值。
export function causalRegion(x, z, t) {
  const radial = Math.hypot(x, z);
  if (Math.abs(radial - Math.abs(t)) < 1e-8) return t >= 0 ? 'futureLight' : 'pastLight';
  if (radial > Math.abs(t)) return 'outside';
  return t >= 0 ? 'future' : 'past';
}

// 球对称天体的弱场远源偏折，b 是未偏折光线的碰撞参数。
export function deflection(solarMasses, solarRadii) {
  if (solarMasses < 0 || solarRadii <= 0) throw new RangeError('Invalid lens parameters');
  const radians = 4 * G * solarMasses * SOLAR_MASS / (solarRadii * SOLAR_RADIUS * C ** 2);
  return { radians, arcseconds: radians * 180 / Math.PI * 3600 };
}
