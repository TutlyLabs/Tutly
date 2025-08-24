const GITHUB_API = "https://api.github.com/users/";

export async function isHandleValid(handle: string): Promise<boolean> {
  try {
    const response = await fetch(`${GITHUB_API}${handle}`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getScore(handle: string) {
  try {
    const response = await fetch(`${GITHUB_API}${handle}`);
    if (!response.ok) throw new Error("User not found");

    const data = (await response.json()) as {
      public_repos: number;
      followers: number;
    };

    const score = data.public_repos * 10 + data.followers * 5;

    return {
      score: score.toString(),
      problemCount: data.public_repos,
      currentRating: data.followers,
    };
  } catch {
    throw new Error("Failed to fetch score");
  }
}
