import type { BBox, LonLat } from "./types";

// Built-in gazetteer (approximate centres, WGS84 lon/lat). An episode adds or overrides places in episode.json.
export const PLACES: Record<string, LonLat> = {
  // Thailand
  bangkok: [100.49, 13.75], thonburi: [100.489, 13.743], ayutthaya: [100.566, 14.357], sukhothai: [99.703, 17.007],
  chiangmai: [98.985, 18.788], chiangrai: [99.83, 19.91], lampang: [99.49, 18.29], nan: [100.77, 18.78],
  phrae: [100.14, 18.14], phitsanulok: [100.26, 16.82], kamphaengphet: [99.52, 16.48], tak: [99.13, 16.88],
  nakhonsawan: [100.12, 15.7], lopburi: [100.65, 14.8], suphanburi: [100.12, 14.47], kanchanaburi: [99.53, 14.02],
  ratchaburi: [99.81, 13.54], phetchaburi: [99.95, 13.11], prachuap: [99.8, 11.81], chumphon: [99.18, 10.49],
  suratthani: [99.33, 9.14], nakhonsithammarat: [99.96, 8.43], songkhla: [100.59, 7.2], pattani: [101.25, 6.87],
  phuket: [98.39, 7.88], thalang: [98.34, 8.03], chanthaburi: [102.1, 12.61], trat: [102.51, 12.24],
  rayong: [101.28, 12.68], chonburi: [100.98, 13.36], prachinburi: [101.37, 14.05], nakhonratchasima: [102.1, 14.97],
  korat: [102.1, 14.97], khonkaen: [102.83, 16.43], udonthani: [102.79, 17.41], nongkhai: [102.74, 17.88],
  ubon: [104.85, 15.24], nakhonphanom: [104.78, 17.4], loei: [101.72, 17.49], samutprakan: [100.6, 13.6],
  // Southeast Asia
  vientiane: [102.6, 17.97], luangprabang: [102.14, 19.89], champasak: [105.87, 14.89], phnompenh: [104.92, 11.56],
  siemreap: [103.86, 13.36], angkor: [103.867, 13.4125], battambang: [103.2, 13.1], hanoi: [105.85, 21.03],
  hue: [107.58, 16.46], saigon: [106.7, 10.78], yangon: [96.16, 16.8], rangoon: [96.16, 16.8], mandalay: [96.08, 21.98],
  ava: [95.99, 21.86], pegu: [96.48, 17.34], bago: [96.48, 17.34], tavoy: [98.2, 14.08], dawei: [98.2, 14.08],
  martaban: [97.55, 16.53], mergui: [98.6, 12.44], kualalumpur: [101.69, 3.14], penang: [100.33, 5.42],
  malacca: [102.25, 2.19], singapore: [103.85, 1.29], jakarta: [106.82, -6.13], batavia: [106.82, -6.13],
  manila: [120.98, 14.6], kedah: [100.37, 6.12], kelantan: [102.24, 6.13],
  // Asia & world
  beijing: [116.4, 39.9], guangzhou: [113.26, 23.13], hongkong: [114.17, 22.32], tokyo: [139.69, 35.69],
  seoul: [126.98, 37.57], delhi: [77.21, 28.61], kolkata: [88.36, 22.57], calcutta: [88.36, 22.57],
  colombo: [79.86, 6.93], dhaka: [90.41, 23.81], kathmandu: [85.32, 27.72], lhasa: [91.1, 29.65],
  tehran: [51.39, 35.69], baghdad: [44.36, 33.31], istanbul: [28.98, 41.01], cairo: [31.24, 30.04],
  jerusalem: [35.21, 31.77], moscow: [37.62, 55.76], petersburg: [30.31, 59.94], kyiv: [30.52, 50.45],
  warsaw: [21.01, 52.23], berlin: [13.4, 52.52], paris: [2.35, 48.86], london: [-0.12, 51.5], madrid: [-3.7, 40.42],
  lisbon: [-9.14, 38.72], rome: [12.5, 41.9], vienna: [16.37, 48.21], amsterdam: [4.9, 52.37],
  washington: [-77.04, 38.9], newyork: [-74.0, 40.71], losangeles: [-118.24, 34.05], mexicocity: [-99.13, 19.43],
  sydney: [151.21, -33.87], nairobi: [36.82, -1.29], capetown: [18.42, -33.92],
};

// Ready-made views [west, south, east, north].
export const VIEWS: Record<string, BBox> = {
  world: [-170, -50, 170, 72],
  asia: [60, -10, 150, 55],
  seasia: [91, -8, 125, 25],
  mainland: [92, 4, 110, 25],
  thailand: [97.3, 5.6, 105.7, 20.5],
  central: [99.4, 13.2, 101.6, 15.6],
  north: [97.3, 16.8, 101.5, 20.5],
  northeast: [101.3, 14.0, 105.7, 18.5],
  south: [97.5, 5.6, 102.2, 11.0],
  bangkok: [100.35, 13.6, 100.7, 13.95],
  ayutthaya: [100.45, 14.28, 100.65, 14.43],
  burma: [92, 9.5, 101.5, 28.5],
  indochina: [101.5, 8.2, 110, 23.5],
  malaya: [99, 0.8, 105, 7.6],
  china: [73, 18, 135, 54],
  europe: [-12, 35, 40, 62],
  middleeast: [25, 12, 63, 42],
};

export const NAMED_COLORS: Record<string, string> = {
  red: "#e8443a", blue: "#3f8cff", gold: "#ffc94a", green: "#3fbf6a", purple: "#a05ad8", gray: "#9aa4b2",
  orange: "#ff8a3d", teal: "#2ec4b6", white: "#f4f0e6",
};
