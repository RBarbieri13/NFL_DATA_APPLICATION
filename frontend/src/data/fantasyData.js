// Mock fantasy data matching the screenshot structure

// Helper to generate the identical RB stats seen in the screenshot
const commonRBStats = {
  misc: { num: 24, fpts: 22.1 },
  rushing: { att: 26, yds: 102, td: 1 },
  receiving: { tgts: 4, rec: 2, yds: 22, td: 0 },
};

export const mockFantasyData = [
  {
    id: "1",
    name: "Kirk Cousins",
    pos: "QB",
    opp: "vs TEN",
    matchupTime: "Thu. 7 PM",
    price: 10000,
    proj: 12,
    team: "MIN",
    weeks: [
      {
        weekNum: 1,
        misc: { num: 81, fpts: 16.5 },
        passing: { cmpAtt: "24-45", yds: 169, td: 1, int: 2 },
        rushing: { att: 5, yds: 39, td: 0 },
      },
      {
        weekNum: 2,
        misc: { num: 81, fpts: 16.5 },
        passing: { cmpAtt: "24-45", yds: 169, td: 1, int: 2 },
        rushing: { att: 5, yds: 39, td: 0 },
      },
      {
        weekNum: 3,
        misc: { num: 81, fpts: 16.5 },
        passing: { cmpAtt: "24-45", yds: 169, td: 1, int: 2 },
        rushing: { att: 5, yds: 39, td: 0 },
      },
    ],
  },
  // The following RBs have identical data in the screenshot
  ...["Bijan Robinson", "Tyler Allgeier", "Avery Williams", "Jase McClellan", "Carlos Washington"].map((name, idx) => ({
    id: `rb-${idx + 2}`,
    name: name,
    pos: "RB",
    opp: "@ MIN",
    matchupTime: "Sun 12 PM",
    price: 3000,
    proj: 23.5,
    team: "ATL",
    weeks: [
      { weekNum: 1, ...commonRBStats },
      { weekNum: 2, ...commonRBStats },
      { weekNum: 3, ...commonRBStats },
    ],
  }))
];

