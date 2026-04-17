/**
 * Realistic college parking occupancy profiles by day of week.
 * Each array maps hour (0-24) to occupancy fraction (0-1).
 *
 * Tuned from research on campus parking demand (ITE, UNC Charlotte TAPS,
 * UWM parking study): peak demand is 9:30am–2:30pm with the crunch at 11am–12pm,
 * Wednesday is the heaviest day, and lots stay 80%+ until 4–5pm because
 * afternoon classes and labs hold cars late. Evening classes cause a small
 * secondary bump 6–8pm.
 */
export const DAY_PROFILES: Record<number, [number, number][]> = {
  // Sunday (day 0) — minimal traffic, maybe a few students/events
  0: [[0,.02],[5,.02],[7,.03],[9,.06],[10,.08],[11,.11],[12,.13],[13,.12],[14,.10],[15,.08],[17,.05],[20,.03],[24,.02]],

  // Monday (day 1) — heavy: full class schedule, peak ~98%, stays 80%+ till 4:30pm
  1: [[0,.03],[5,.03],[6,.06],[7,.22],[7.5,.44],[8,.66],[8.5,.82],[9,.91],[9.5,.95],[10,.97],[10.5,.98],[11,.98],[11.5,.98],[12,.97],[12.5,.96],[13,.95],[13.5,.94],[14,.93],[14.5,.91],[15,.89],[15.5,.87],[16,.83],[16.5,.78],[17,.68],[17.5,.55],[18,.40],[18.5,.28],[19,.22],[19.5,.20],[20,.16],[20.5,.12],[21,.08],[22,.05],[24,.03]],

  // Tuesday (day 2) — moderate-heavy, peak ~95%
  2: [[0,.03],[5,.03],[6,.05],[7,.18],[7.5,.36],[8,.56],[8.5,.72],[9,.85],[9.5,.91],[10,.93],[10.5,.94],[11,.95],[11.5,.95],[12,.94],[12.5,.93],[13,.92],[13.5,.91],[14,.90],[14.5,.88],[15,.85],[15.5,.82],[16,.78],[16.5,.72],[17,.60],[17.5,.46],[18,.32],[18.5,.22],[19,.18],[19.5,.16],[20,.12],[20.5,.09],[21,.06],[22,.04],[24,.03]],

  // Wednesday (day 3) — busiest day, peak 99%, stays 90%+ till 3pm, 80%+ till 4:30pm
  3: [[0,.03],[5,.03],[6,.07],[7,.24],[7.5,.48],[8,.70],[8.5,.85],[9,.93],[9.5,.97],[10,.98],[10.5,.99],[11,.99],[11.5,.99],[12,.98],[12.5,.97],[13,.96],[13.5,.95],[14,.94],[14.5,.92],[15,.90],[15.5,.88],[16,.84],[16.5,.79],[17,.68],[17.5,.54],[18,.39],[18.5,.28],[19,.24],[19.5,.21],[20,.16],[20.5,.12],[21,.08],[22,.05],[24,.03]],

  // Thursday (day 4) — moderate-heavy, peak ~95%
  4: [[0,.03],[5,.03],[6,.05],[7,.18],[7.5,.36],[8,.56],[8.5,.72],[9,.85],[9.5,.91],[10,.93],[10.5,.94],[11,.95],[11.5,.95],[12,.94],[12.5,.93],[13,.92],[13.5,.91],[14,.90],[14.5,.88],[15,.85],[15.5,.82],[16,.78],[16.5,.72],[17,.60],[17.5,.46],[18,.32],[18.5,.22],[19,.18],[19.5,.16],[20,.12],[20.5,.09],[21,.06],[22,.04],[24,.03]],

  // Friday (day 5) — moderate peak, faster late-afternoon clear-out (fewer evening classes)
  5: [[0,.03],[5,.03],[6,.05],[7,.17],[7.5,.33],[8,.52],[8.5,.66],[9,.79],[9.5,.85],[10,.88],[10.5,.90],[11,.91],[11.5,.90],[12,.89],[12.5,.87],[13,.85],[13.5,.83],[14,.80],[14.5,.75],[15,.68],[15.5,.60],[16,.50],[16.5,.38],[17,.26],[17.5,.17],[18,.11],[19,.07],[20,.05],[21,.04],[24,.03]],

  // Saturday (day 6) — low traffic, small lunch + dinner bumps
  6: [[0,.02],[5,.02],[7,.03],[8,.05],[9,.10],[10,.15],[11,.20],[12,.24],[13,.25],[14,.22],[15,.18],[16,.15],[17,.12],[18,.10],[19,.08],[20,.05],[22,.03],[24,.02]],
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
