"""
Static lookup tables for Japanese player names and MLB team names in Japanese.

The MLB Stats API does not return Japanese translations. These mappings are
maintained manually and keyed by MLB player ID (string) and English team name.
"""

# MLB player ID → Japanese name
PLAYER_NAMES_JA: dict[str, str] = {
    "608372": "菅野智之",
    "628317": "前田健太",
    "641933": "有原航平",
    "660271": "大谷翔平",
    "672960": "岡本和真",
    "673513": "松井裕樹",
    "673540": "千賀滉大",
    "673548": "鈴木誠也",
    "684007": "今永昇太",
    "807747": "西田勇輝",
    "807799": "吉田正尚",
    "808959": "村上宗隆",
    "808963": "佐々木朗希",
    "808967": "山本由伸",
    "837227": "今井達也",
}

# English team name (as returned by MLB Stats API) → Japanese name
MLB_TEAMS_JA: dict[str, str] = {
    "Arizona Diamondbacks": "アリゾナ・ダイヤモンドバックス",
    "Atlanta Braves": "アトランタ・ブレーブス",
    "Baltimore Orioles": "ボルチモア・オリオールズ",
    "Boston Red Sox": "ボストン・レッドソックス",
    "Chicago Cubs": "シカゴ・カブス",
    "Chicago White Sox": "シカゴ・ホワイトソックス",
    "Cincinnati Reds": "シンシナティ・レッズ",
    "Cleveland Guardians": "クリーブランド・ガーディアンズ",
    "Colorado Rockies": "コロラド・ロッキーズ",
    "Detroit Tigers": "デトロイト・タイガース",
    "Houston Astros": "ヒューストン・アストロズ",
    "Kansas City Royals": "カンザスシティ・ロイヤルズ",
    "Los Angeles Angels": "ロサンゼルス・エンゼルス",
    "Los Angeles Dodgers": "ロサンゼルス・ドジャース",
    "Las Vegas Athletics": "ラスベガス・アスレチックス",
    "Miami Marlins": "マイアミ・マーリンズ",
    "Milwaukee Brewers": "ミルウォーキー・ブルワーズ",
    "Minnesota Twins": "ミネソタ・ツインズ",
    "New York Mets": "ニューヨーク・メッツ",
    "New York Yankees": "ニューヨーク・ヤンキース",
    "Oakland Athletics": "オークランド・アスレチックス",
    "Philadelphia Phillies": "フィラデルフィア・フィリーズ",
    "Pittsburgh Pirates": "ピッツバーグ・パイレーツ",
    "San Diego Padres": "サンディエゴ・パドレス",
    "San Francisco Giants": "サンフランシスコ・ジャイアンツ",
    "Seattle Mariners": "シアトル・マリナーズ",
    "St. Louis Cardinals": "セントルイス・カーディナルス",
    "Tampa Bay Rays": "タンパベイ・レイズ",
    "Texas Rangers": "テキサス・レンジャーズ",
    "Toronto Blue Jays": "トロント・ブルージェイズ",
    "Washington Nationals": "ワシントン・ナショナルズ",
}


def player_name_ja(player_id: str, fallback: str = "") -> str:
    """Return Japanese name for a player, or fallback if not in mapping."""
    return PLAYER_NAMES_JA.get(player_id, fallback)


def team_name_ja(team_name_en: str) -> str:
    """Return Japanese team name, or empty string if not in mapping."""
    return MLB_TEAMS_JA.get(team_name_en, "")


def mlb_photo_url(player_id: str) -> str:
    """Return the MLB Stats API official headshot CDN URL for a player."""
    return (
        f"https://img.mlbstatic.com/mlb-photos/image/upload/"
        f"d_people:generic:headshot:67:current.png/"
        f"w_213,q_auto:best/v1/people/{player_id}/headshot/67/current"
    )
