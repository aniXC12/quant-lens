export type TeamName =
  | "McLaren"
  | "Ferrari"
  | "Red Bull Racing"
  | "Mercedes"
  | "Aston Martin"
  | "Racing Bulls"
  | "Haas F1 Team"
  | "Alpine"
  | "Williams"
  | "Kick Sauber";

export type DriverOption = {
  id: string;
  driver: string;
  team: TeamName;
  accent: string;
  accentSoft: string;
  seasonRank: number;
  seasonPoints: number;
};

export const DRIVER_OPTIONS: DriverOption[] = [
  {
    id: "lando-norris",
    driver: "Lando Norris",
    team: "McLaren",
    accent: "#ff8700",
    accentSoft: "rgba(255, 135, 0, 0.18)",
    seasonRank: 1,
    seasonPoints: 423,
  },
  {
    id: "oscar-piastri",
    driver: "Oscar Piastri",
    team: "McLaren",
    accent: "#ff8700",
    accentSoft: "rgba(255, 135, 0, 0.18)",
    seasonRank: 3,
    seasonPoints: 410,
  },
  {
    id: "charles-leclerc",
    driver: "Charles Leclerc",
    team: "Ferrari",
    accent: "#dc0000",
    accentSoft: "rgba(220, 0, 0, 0.18)",
    seasonRank: 5,
    seasonPoints: 242,
  },
  {
    id: "lewis-hamilton",
    driver: "Lewis Hamilton",
    team: "Ferrari",
    accent: "#dc0000",
    accentSoft: "rgba(220, 0, 0, 0.18)",
    seasonRank: 6,
    seasonPoints: 156,
  },
  {
    id: "max-verstappen",
    driver: "Max Verstappen",
    team: "Red Bull Racing",
    accent: "#1e5bc6",
    accentSoft: "rgba(30, 91, 198, 0.18)",
    seasonRank: 2,
    seasonPoints: 421,
  },
  {
    id: "liam-lawson",
    driver: "Liam Lawson",
    team: "Racing Bulls",
    accent: "#6692ff",
    accentSoft: "rgba(102, 146, 255, 0.18)",
    seasonRank: 14,
    seasonPoints: 38,
  },
  {
    id: "george-russell",
    driver: "George Russell",
    team: "Mercedes",
    accent: "#27f4d2",
    accentSoft: "rgba(39, 244, 210, 0.18)",
    seasonRank: 4,
    seasonPoints: 319,
  },
  {
    id: "kimi-antonelli",
    driver: "Andrea Kimi Antonelli",
    team: "Mercedes",
    accent: "#27f4d2",
    accentSoft: "rgba(39, 244, 210, 0.18)",
    seasonRank: 7,
    seasonPoints: 150,
  },
  {
    id: "fernando-alonso",
    driver: "Fernando Alonso",
    team: "Aston Martin",
    accent: "#229971",
    accentSoft: "rgba(34, 153, 113, 0.18)",
    seasonRank: 10,
    seasonPoints: 56,
  },
  {
    id: "lance-stroll",
    driver: "Lance Stroll",
    team: "Aston Martin",
    accent: "#229971",
    accentSoft: "rgba(34, 153, 113, 0.18)",
    seasonRank: 16,
    seasonPoints: 33,
  },
  {
    id: "yuki-tsunoda",
    driver: "Yuki Tsunoda",
    team: "Red Bull Racing",
    accent: "#1e5bc6",
    accentSoft: "rgba(30, 91, 198, 0.18)",
    seasonRank: 17,
    seasonPoints: 33,
  },
  {
    id: "isack-hadjar",
    driver: "Isack Hadjar",
    team: "Racing Bulls",
    accent: "#6692ff",
    accentSoft: "rgba(102, 146, 255, 0.18)",
    seasonRank: 12,
    seasonPoints: 51,
  },
  {
    id: "oliver-bearman",
    driver: "Oliver Bearman",
    team: "Haas F1 Team",
    accent: "#b6babd",
    accentSoft: "rgba(182, 186, 189, 0.18)",
    seasonRank: 13,
    seasonPoints: 41,
  },
  {
    id: "esteban-ocon",
    driver: "Esteban Ocon",
    team: "Haas F1 Team",
    accent: "#b6babd",
    accentSoft: "rgba(182, 186, 189, 0.18)",
    seasonRank: 15,
    seasonPoints: 38,
  },
  {
    id: "pierre-gasly",
    driver: "Pierre Gasly",
    team: "Alpine",
    accent: "#ff87bc",
    accentSoft: "rgba(255, 135, 188, 0.18)",
    seasonRank: 18,
    seasonPoints: 22,
  },
  {
    id: "jack-doohan",
    driver: "Jack Doohan",
    team: "Alpine",
    accent: "#ff87bc",
    accentSoft: "rgba(255, 135, 188, 0.18)",
    seasonRank: 21,
    seasonPoints: 0,
  },
  {
    id: "franco-colapinto",
    driver: "Franco Colapinto",
    team: "Alpine",
    accent: "#ff87bc",
    accentSoft: "rgba(255, 135, 188, 0.18)",
    seasonRank: 20,
    seasonPoints: 0,
  },
  {
    id: "alex-albon",
    driver: "Alex Albon",
    team: "Williams",
    accent: "#1868db",
    accentSoft: "rgba(24, 104, 219, 0.18)",
    seasonRank: 8,
    seasonPoints: 73,
  },
  {
    id: "carlos-sainz",
    driver: "Carlos Sainz",
    team: "Williams",
    accent: "#1868db",
    accentSoft: "rgba(24, 104, 219, 0.18)",
    seasonRank: 9,
    seasonPoints: 64,
  },
  {
    id: "nico-hulkenberg",
    driver: "Nico Hulkenberg",
    team: "Kick Sauber",
    accent: "#52e252",
    accentSoft: "rgba(82, 226, 82, 0.18)",
    seasonRank: 11,
    seasonPoints: 51,
  },
  {
    id: "gabriel-bortoleto",
    driver: "Gabriel Bortoleto",
    team: "Kick Sauber",
    accent: "#52e252",
    accentSoft: "rgba(82, 226, 82, 0.18)",
    seasonRank: 19,
    seasonPoints: 19,
  },
];
