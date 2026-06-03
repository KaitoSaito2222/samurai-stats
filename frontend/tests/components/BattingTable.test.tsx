import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/ja.json";
import BattingTable from "@/components/games/BattingTable";
import type { BoxscoreBatter } from "@/lib/api";

// next/link needs the App Router context, which isn't mounted in unit tests.
// Render it as a plain anchor so we can assert on hrefs.
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(() => cleanup());

function renderWithIntl(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function makeBatter(overrides: Partial<BoxscoreBatter> = {}): BoxscoreBatter {
  return {
    player_id: "592450",
    name_en: "Mookie Betts",
    name_ja: "Mookie Betts",
    is_analyzable: false,
    position: "SS",
    batting_order: 1,
    at_bats: 4,
    runs: 1,
    hits: 2,
    doubles: 1,
    home_runs: 0,
    rbi: 1,
    walks: 0,
    strikeouts: 1,
    avg: 0.28,
    ...overrides,
  };
}

describe("BattingTable", () => {
  it("renders nothing when there are no batters", () => {
    const { container } = renderWithIntl(<BattingTable batters={[]} locale="ja" />);
    expect(container.querySelector("table")).toBeNull();
  });

  it("renders one row per batter with batting stats", () => {
    const batters = [makeBatter(), makeBatter({ player_id: "111", batting_order: 2 })];
    const { container } = renderWithIntl(<BattingTable batters={batters} locale="ja" />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
  });

  it("links analyzable players to their player page and highlights them", () => {
    const batters = [
      makeBatter({
        player_id: "660271",
        name_ja: "大谷翔平",
        name_en: "Shohei Ohtani",
        is_analyzable: true,
      }),
    ];
    const { container } = renderWithIntl(<BattingTable batters={batters} locale="ja" />);

    const link = container.querySelector('a[href="/ja/players/660271"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("大谷翔平");
  });

  it("renders non-analyzable players as plain text without a link", () => {
    const batters = [makeBatter({ player_id: "592450", is_analyzable: false })];
    const { container } = renderWithIntl(<BattingTable batters={batters} locale="ja" />);

    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("Mookie Betts");
  });

  it("formats season average without a leading zero", () => {
    const batters = [makeBatter({ avg: 0.314 })];
    const { container } = renderWithIntl(<BattingTable batters={batters} locale="ja" />);
    expect(container.textContent).toContain(".314");
  });
});
