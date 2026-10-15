import { errorResponse } from "@/app/lib/api";

type GoogleAutocompleteSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: {
      text?: string;
    };
    structuredFormat?: {
      mainText?: {
        text?: string;
      };
      secondaryText?: {
        text?: string;
      };
    };
  };
};

type GoogleAutocompleteResponse = {
  suggestions?: GoogleAutocompleteSuggestion[];
  error?: {
    message?: string;
    status?: string;
  };
};

function parseQuery(value: string | null) {
  return value?.trim() ?? "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = parseQuery(searchParams.get("query"));

  if (input.length < 3) {
    return Response.json({ ok: true, suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return errorResponse(
      500,
      "Suggestions are temporarily unavailable.",
      "GOOGLE_MAPS_API_KEY is not set.",
    );
  }

  let data: GoogleAutocompleteResponse;

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
        },
        body: JSON.stringify({
          input,
          includedRegionCodes: ["au"],
          includeQueryPredictions: false,
        }),
        // Suggestions are only useful while the visitor is typing.
        signal: AbortSignal.timeout(5000),
      },
    );
    data = (await response.json()) as GoogleAutocompleteResponse;

    if (!response.ok) {
      return errorResponse(
        502,
        "Suggestions are temporarily unavailable.",
        "Google autocomplete failed:",
        response.status,
        data.error?.message,
      );
    }
  } catch (error) {
    return errorResponse(
      502,
      "Suggestions are temporarily unavailable.",
      "Google autocomplete request failed:",
      error,
    );
  }

  const suggestions =
    data.suggestions
      ?.map((suggestion) => {
        const prediction = suggestion.placePrediction;
        const text = prediction?.text?.text;

        if (!prediction?.placeId || !text) {
          return null;
        }

        return {
          placeId: prediction.placeId,
          text,
          mainText: prediction.structuredFormat?.mainText?.text ?? text,
          secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
        };
      })
      .filter((suggestion) => suggestion !== null) ?? [];

  return Response.json({ ok: true, suggestions });
}
