// MLB team ID → logo URL mapping using MLB's official static CDN.
// Team IDs are stable and match the MLB Stats API.
const MLB_TEAM_LOGO_BASE = "https://www.mlbstatic.com/team-logos";

// Maps numeric team ID to logo URL.
export function teamLogoUrl(teamId: number | string): string {
  return `${MLB_TEAM_LOGO_BASE}/${teamId}.svg`;
}

// Resolve a logo URL, preferring a stable team ID and falling back to
// English-name matching for rows synced before team IDs were stored.
export function resolveTeamLogo(
  teamId: number | string | null | undefined,
  teamNameEn: string,
): string | null {
  if (teamId !== null && teamId !== undefined && teamId !== "") {
    return teamLogoUrl(teamId);
  }
  return teamLogoByName(teamNameEn);
}

// Maps common team name variants (English) to MLB team IDs.
// Covers full names (MLB API), short names, and abbreviations.
const TEAM_NAME_TO_ID: Record<string, number> = {
  // Arizona
  "Arizona Diamondbacks": 109, "Diamondbacks": 109, "D-backs": 109, "ARI": 109,
  // Atlanta
  "Atlanta Braves": 144, "Braves": 144, "ATL": 144,
  // Baltimore
  "Baltimore Orioles": 110, "Orioles": 110, "BAL": 110,
  // Boston
  "Boston Red Sox": 111, "Red Sox": 111, "BOS": 111,
  // Chicago Cubs
  "Chicago Cubs": 112, "Cubs": 112, "CHC": 112,
  // Chicago White Sox
  "Chicago White Sox": 145, "White Sox": 145, "CWS": 145, "CHW": 145,
  // Cincinnati
  "Cincinnati Reds": 113, "Reds": 113, "CIN": 113,
  // Cleveland
  "Cleveland Guardians": 114, "Guardians": 114, "CLE": 114,
  // Colorado
  "Colorado Rockies": 115, "Rockies": 115, "COL": 115,
  // Detroit
  "Detroit Tigers": 116, "Tigers": 116, "DET": 116,
  // Houston
  "Houston Astros": 117, "Astros": 117, "HOU": 117,
  // Kansas City
  "Kansas City Royals": 118, "Royals": 118, "KC": 118, "KCR": 118,
  // LA Angels
  "Los Angeles Angels": 108, "Angels": 108, "LAA": 108,
  "LA Angels": 108, "Anaheim Angels": 108,
  // LA Dodgers
  "Los Angeles Dodgers": 119, "Dodgers": 119, "LAD": 119,
  "LA Dodgers": 119,
  // Miami
  "Miami Marlins": 146, "Marlins": 146, "MIA": 146,
  // Milwaukee
  "Milwaukee Brewers": 158, "Brewers": 158, "MIL": 158,
  // Minnesota
  "Minnesota Twins": 142, "Twins": 142, "MIN": 142,
  // NY Mets
  "New York Mets": 121, "Mets": 121, "NYM": 121, "NY Mets": 121,
  // NY Yankees
  "New York Yankees": 147, "Yankees": 147, "NYY": 147, "NY Yankees": 147,
  // Oakland Athletics (relocated; API still returns "Athletics" or "Oakland Athletics")
  "Oakland Athletics": 133, "Athletics": 133, "OAK": 133,
  // Philadelphia
  "Philadelphia Phillies": 143, "Phillies": 143, "PHI": 143,
  // Pittsburgh
  "Pittsburgh Pirates": 134, "Pirates": 134, "PIT": 134,
  // San Diego
  "San Diego Padres": 135, "Padres": 135, "SD": 135, "SDP": 135,
  // San Francisco
  "San Francisco Giants": 137, "Giants": 137, "SF": 137, "SFG": 137,
  // Seattle
  "Seattle Mariners": 136, "Mariners": 136, "SEA": 136,
  // St. Louis
  "St. Louis Cardinals": 138, "Cardinals": 138, "STL": 138,
  "St Louis Cardinals": 138,
  // Tampa Bay
  "Tampa Bay Rays": 139, "Rays": 139, "TB": 139, "TBR": 139,
  // Texas
  "Texas Rangers": 140, "Rangers": 140, "TEX": 140,
  // Toronto
  "Toronto Blue Jays": 141, "Blue Jays": 141, "TOR": 141,
  // Washington
  "Washington Nationals": 120, "Nationals": 120, "WSH": 120, "WAS": 120,
};

// Returns the logo URL for a team by its English name, or null if not found.
export function teamLogoByName(teamNameEn: string): string | null {
  const id = TEAM_NAME_TO_ID[teamNameEn];
  if (!id) return null;
  return teamLogoUrl(id);
}
