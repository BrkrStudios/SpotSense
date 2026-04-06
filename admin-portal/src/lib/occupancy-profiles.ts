/**
 * Realistic college parking occupancy profiles by day of week.
 * Each array maps hour (0-24) to occupancy fraction (0-1).
 *
 * Tuned for a small campus where the lot stays 85-90%+ from 10 AM to 2-3 PM
 * and doesn't clear out until late afternoon (4-6 PM). Peak is 95-99%.
 */
export const DAY_PROFILES: Record<number, [number, number][]> = {
  // Sunday (day 0) — minimal traffic, maybe a few students/events
  0: [[0,.02],[5,.02],[7,.03],[9,.06],[10,.10],[11,.13],[12,.14],[13,.12],[14,.10],[15,.08],[17,.05],[20,.03],[24,.02]],

  // Monday (day 1) — heavy: full class schedule, stays packed till 3pm
  1: [[0,.03],[5,.03],[6,.05],[7,.20],[7.5,.40],[8,.62],[8.5,.78],[9,.88],[9.5,.93],[10,.95],[10.5,.97],[11,.98],[11.5,.97],[12,.96],[12.5,.94],[13,.92],[13.5,.90],[14,.87],[14.5,.83],[15,.75],[15.5,.63],[16,.50],[16.5,.37],[17,.26],[17.5,.18],[18,.12],[19,.08],[20,.05],[21,.04],[24,.03]],

  // Tuesday (day 2) — moderate-heavy
  2: [[0,.03],[5,.03],[6,.04],[7,.14],[7.5,.30],[8,.52],[8.5,.68],[9,.80],[9.5,.87],[10,.91],[10.5,.93],[11,.94],[11.5,.93],[12,.91],[12.5,.89],[13,.87],[13.5,.85],[14,.83],[14.5,.78],[15,.70],[15.5,.58],[16,.45],[16.5,.32],[17,.22],[17.5,.15],[18,.10],[19,.06],[20,.04],[21,.03],[24,.03]],

  // Wednesday (day 3) — busiest day
  3: [[0,.03],[5,.03],[6,.06],[7,.22],[7.5,.42],[8,.65],[8.5,.80],[9,.90],[9.5,.95],[10,.97],[10.5,.98],[11,.99],[11.5,.98],[12,.97],[12.5,.95],[13,.93],[13.5,.91],[14,.89],[14.5,.84],[15,.77],[15.5,.65],[16,.52],[16.5,.38],[17,.26],[17.5,.18],[18,.12],[19,.08],[20,.05],[21,.04],[24,.03]],

  // Thursday (day 4) — moderate-heavy
  4: [[0,.03],[5,.03],[6,.04],[7,.14],[7.5,.30],[8,.52],[8.5,.68],[9,.80],[9.5,.87],[10,.91],[10.5,.93],[11,.94],[11.5,.93],[12,.91],[12.5,.89],[13,.87],[13.5,.85],[14,.83],[14.5,.78],[15,.70],[15.5,.58],[16,.45],[16.5,.32],[17,.22],[17.5,.15],[18,.10],[19,.06],[20,.04],[21,.03],[24,.03]],

  // Friday (day 5) — moderate, lighter late afternoon
  5: [[0,.03],[5,.03],[6,.05],[7,.16],[7.5,.32],[8,.50],[8.5,.65],[9,.77],[9.5,.83],[10,.87],[10.5,.89],[11,.90],[11.5,.89],[12,.87],[12.5,.85],[13,.83],[13.5,.80],[14,.75],[14.5,.66],[15,.54],[15.5,.41],[16,.29],[16.5,.20],[17,.13],[18,.08],[19,.05],[20,.04],[24,.03]],

  // Saturday (day 6) — low traffic
  6: [[0,.02],[5,.02],[7,.03],[8,.06],[9,.12],[10,.18],[11,.22],[12,.24],[13,.23],[14,.20],[15,.17],[16,.14],[17,.10],[18,.07],[20,.04],[24,.02]],
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
