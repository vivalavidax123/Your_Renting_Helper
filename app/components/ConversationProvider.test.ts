import { describe, expect, it } from "vitest";
import { buildConversationRequestBody } from "./ConversationProvider";

describe("buildConversationRequestBody", () => {
  it("builds a single-location analyst request without comparison ids", () => {
    expect(
      buildConversationRequestBody({
        question: "What should I verify?",
        profile: "carFree",
        preset: "balanced",
      }),
    ).toEqual({
      question: "What should I verify?",
      profile: "carFree",
      preset: "balanced",
    });
  });

  it("uses locationIds for a comparison analyst request", () => {
    expect(
      buildConversationRequestBody({
        question: "Which location is easier without a car?",
        profile: "carOwner",
        preset: "family",
        locationIds: ["location-a", "location-b"],
      }),
    ).toEqual({
      question: "Which location is easier without a car?",
      profile: "carOwner",
      preset: "family",
      locationIds: ["location-a", "location-b"],
    });
  });
});
