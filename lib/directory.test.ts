import { describe, expect, test } from "vitest";

import {
  buildGraphEdges,
  formatWebsiteLabel,
  getConnectedMemberIds,
  getInitials,
} from "@/lib/directory";
import { getMemberById, members } from "@/lib/members";

describe("directory helpers", () => {
  test("keeps the onboarding roster and normalizes shared profile links", () => {
    expect(members.length).toBeGreaterThanOrEqual(22);
    expect(members.find((member) => member.id === "jay-khemchandani")?.links.linkedin).toBe(
      "https://www.linkedin.com/in/jay-khemchandani",
    );
    expect(members.find((member) => member.id === "jason-yi")?.links.tiktok).toBe(
      "https://www.tiktok.com/@jasonyi33/",
    );
    expect(getMemberById("jason-yi")?.profile.headline).toContain("UC Berkeley");
  });

  test("formats website labels without the protocol", () => {
    expect(formatWebsiteLabel("https://www.example.com/studio/")).toBe(
      "example.com/studio",
    );
  });

  test("builds initials for avatar fallbacks", () => {
    expect(getInitials("Ryan Fernandes")).toBe("RF");
  });

  test("builds a stable student network from shared university groups", () => {
    const edges = buildGraphEdges(members);

    expect(edges.length).toBeGreaterThan(0);
    expect(
      edges.some(
        (edge) =>
          edge.sourceId === "jay-khemchandani" && edge.targetId === "mark-music",
      ),
    ).toBe(true);
  });

  test("returns the directly connected ids for a selected student", () => {
    const connectedIds = getConnectedMemberIds("jay-khemchandani", members);

    expect(connectedIds.has("jay-khemchandani")).toBe(true);
    expect(connectedIds.has("mark-music")).toBe(true);
  });
});
