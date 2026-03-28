/**
 * Realistic college parking occupancy profiles by day of week.
 * Each array maps hour (0-24) to occupancy fraction (0-1).
 * Based on real college patterns: classes 8am-5pm, peak 10am-1pm,
 * Monday/Wednesday busiest (freshman + convocation), Tue/Thu moderate,
 * Friday lighter afternoon, weekends low.
 */
export const DAY_PROFILES: Record<number, [number, number][]> = {
  // Sunday (day 0) — minimal traffic
  0: [[0,.02],[5,.02],[7,.03],[9,.05],[10,.08],[11,.10],[12,.12],[13,.10],[14,.08],[15,.06],[17,.04],[20,.03],[24,.02]],
  // Monday (day 1) — heavy (freshman day)
  1: [[0,.03],[5,.03],[6,.05],[7,.18],[7.5,.35],[8,.55],[8.5,.68],[9,.78],[9.5,.85],[10,.90],[10.5,.92],[11,.93],[11.5,.91],[12,.88],[12.5,.86],[13,.84],[13.5,.80],[14,.74],[14.5,.66],[15,.56],[15.5,.45],[16,.35],[16.5,.26],[17,.18],[17.5,.13],[18,.10],[19,.07],[20,.05],[21,.04],[24,.03]],
  // Tuesday (day 2) — moderate-heavy (upperclassmen)
  2: [[0,.03],[5,.03],[6,.04],[7,.12],[7.5,.25],[8,.42],[8.5,.55],[9,.65],[9.5,.72],[10,.78],[10.5,.81],[11,.83],[11.5,.82],[12,.79],[12.5,.77],[13,.74],[13.5,.70],[14,.64],[14.5,.56],[15,.48],[15.5,.38],[16,.30],[16.5,.22],[17,.15],[17.5,.11],[18,.08],[19,.06],[20,.04],[21,.03],[24,.03]],
  // Wednesday (day 3) — busiest (freshman + convocation)
  3: [[0,.03],[5,.03],[6,.06],[7,.20],[7.5,.38],[8,.58],[8.5,.72],[9,.82],[9.5,.88],[10,.93],[10.5,.95],[11,.96],[11.5,.95],[12,.92],[12.5,.90],[13,.87],[13.5,.83],[14,.77],[14.5,.69],[15,.59],[15.5,.48],[16,.38],[16.5,.28],[17,.20],[17.5,.14],[18,.10],[19,.07],[20,.05],[21,.04],[24,.03]],
  // Thursday (day 4) — moderate-heavy (upperclassmen)
  4: [[0,.03],[5,.03],[6,.04],[7,.12],[7.5,.25],[8,.42],[8.5,.55],[9,.65],[9.5,.72],[10,.78],[10.5,.81],[11,.83],[11.5,.82],[12,.79],[12.5,.77],[13,.74],[13.5,.70],[14,.64],[14.5,.56],[15,.48],[15.5,.38],[16,.30],[16.5,.22],[17,.15],[17.5,.11],[18,.08],[19,.06],[20,.04],[21,.03],[24,.03]],
  // Friday (day 5) — moderate, lighter afternoon
  5: [[0,.03],[5,.03],[6,.05],[7,.16],[7.5,.32],[8,.50],[8.5,.62],[9,.72],[9.5,.78],[10,.82],[10.5,.84],[11,.83],[11.5,.80],[12,.75],[12.5,.68],[13,.60],[13.5,.50],[14,.40],[14.5,.32],[15,.25],[15.5,.18],[16,.14],[16.5,.10],[17,.08],[18,.05],[19,.04],[20,.03],[24,.03]],
  // Saturday (day 6) — low traffic
  6: [[0,.02],[5,.02],[7,.03],[8,.05],[9,.10],[10,.16],[11,.20],[12,.22],[13,.21],[14,.18],[15,.15],[16,.12],[17,.08],[18,.05],[20,.03],[24,.02]],
};

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Linearly interpolate the occupancy fraction for a given hour from a day profile */
export function interpolateProfile(profile: [number, number][], hour: number): number {
  if (hour <= profile[0][0]) return profile[0][1];
  if (hour >= profile[profile.length - 1][0]) return profile[profile.length - 1][1];
  for (let i = 0; i < profile.length - 1; i++) {
    const [h0, v0] = profile[i];
    const [h1, v1] = profile[i + 1];
    if (hour >= h0 && hour <= h1) {
      const t = (hour - h0) / (h1 - h0);
      return v0 + t * (v1 - v0);
    }
  }
  return 0;
}
