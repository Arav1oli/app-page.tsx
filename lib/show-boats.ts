export type ShowBoat = {
  rank: number
  name: string
  lengthM: number
  beamM: number
  m2: number
  costAt98PerM2: number
  note?: string
}

export const RATE_PER_M2 = 98

export const SHOW_BOATS: ShowBoat[] = [
  { rank: 1,  name: "Schaefer V44",            lengthM: 13.61, beamM: 4.17, m2: 56.7537,  costAt98PerM2: 5561.86,  note: "confirmed" },
  { rank: 2,  name: "Schaefer 380",            lengthM: 12.39, beamM: 3.65, m2: 45.2235,  costAt98PerM2: 4431.90,  note: "confirmed" },
  { rank: 3,  name: "Nordhavn 68",             lengthM: 20.73, beamM: 6.20, m2: 128.526,  costAt98PerM2: 12595.55, note: "price a problem" },
  { rank: 4,  name: "Nordhavn 55",             lengthM: 17.09, beamM: 5.49, m2: 93.8241,  costAt98PerM2: 9194.76,  note: "likely" },
  { rank: 5,  name: "Marex 330 Scandinavia",   lengthM: 10.00, beamM: 3.40, m2: 34.0000,  costAt98PerM2: 3332.00,  note: "confirmed" },
  { rank: 6,  name: "Saxdor 320",              lengthM: 10.28, beamM: 3.10, m2: 31.868,   costAt98PerM2: 3123.06,  note: "confirmed" },
  { rank: 7,  name: "Schaefer 375",            lengthM: 12.00, beamM: 3.50, m2: 42.0000,  costAt98PerM2: 4116.00,  note: "mark pay" },
  { rank: 8,  name: "Nordhavn 41",             lengthM: 12.60, beamM: 4.24, m2: 53.424,   costAt98PerM2: 5235.55,  note: "price a problem" },
  { rank: 9,  name: "Sunseeker 82 Predator",   lengthM: 25.00, beamM: 6.00, m2: 150.000,  costAt98PerM2: 14700.00, note: "Audrey raising" },
  { rank: 10, name: "Sunseeker 95",            lengthM: 28.00, beamM: 6.50, m2: 182.000,  costAt98PerM2: 17836.00, note: "audrey" },
  { rank: 11, name: "Sunseeker 64 Predator",   lengthM: 20.00, beamM: 5.00, m2: 100.000,  costAt98PerM2: 9800.00,  note: "audrey" },
  { rank: 12, name: "Grady White 303",         lengthM: 9.30,  beamM: 3.20, m2: 29.76,    costAt98PerM2: 2916.48,  note: "Blaye" },
  { rank: 13, name: "Schaefer 510 fly",        lengthM: 10.33, beamM: 3.35, m2: 34.6055,  costAt98PerM2: 3391.34 },
]
