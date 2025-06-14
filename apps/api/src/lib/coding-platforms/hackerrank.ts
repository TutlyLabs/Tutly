const HACKERRANK_API = "https://www.hackerrank.com/rest/";

interface HackerrankResponse {
  status: boolean;
  models?: Track[];
  error?: string;
}

interface Track {
  slug: string;
  practice: {
    score: number;
  };
}

const makeRequest = async <T>(endpoint: string): Promise<T> => {
  const response = await fetch(`${HACKERRANK_API}${endpoint}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error("Failed to fetch data");
  return response.json() as Promise<T>;
};

export async function isHandleValid(handle: string): Promise<boolean> {
  try {
    const data = await makeRequest<HackerrankResponse>(`hackers/${handle}`);
    return data.status;
  } catch {
    return false;
  }
}

export async function getScore(handle: string) {
  try {
    const data = await makeRequest<HackerrankResponse>(
      `hackers/${handle}/scores_elo`,
    );
    let score = 0;
    let currentRating = 0;

    for (const track of data.models ?? []) {
      if (track.slug === "algorithms" || track.slug === "data-structures") {
        score += Math.floor(track.practice.score);
        currentRating = Math.max(currentRating, track.practice.score);
      }
    }

    return { score: score.toString(), problemCount: 0, currentRating };
  } catch {
    throw new Error("Failed to fetch score");
  }
}
