const CODEFORCES_API = "https://codeforces.com/api/";

interface CodeforcesResponse {
  status: string;
  result: unknown;
  comment?: string;
}

interface Submission {
  verdict: string;
  contestId: number;
  problem: {
    name: string;
  };
}

interface UserInfo {
  rating: number;
}

const makeRequest = async (endpoint: string) => {
  const response = await fetch(`${CODEFORCES_API}${endpoint}`);
  const data = (await response.json()) as CodeforcesResponse;

  if (response.status !== 200) {
    throw new Error("Something went wrong");
  }

  return data.result;
};

export async function isHandleValid(handle: string): Promise<boolean> {
  try {
    await makeRequest(`user.status?handle=${handle}&from=1&count=1`);
    return true;
  } catch {
    return false;
  }
}

export async function getScore(handle: string) {
  const [profile, submissions] = await Promise.all([
    makeRequest(`user.info?handles=${handle}`) as Promise<UserInfo[]>,
    makeRequest(`user.status?handle=${handle}&from=1&count=500`) as Promise<
      Submission[]
    >,
  ]);

  const visitedProblems = new Set<string>();
  const visitedContests = new Set<number>();
  let score = 0;

  for (const submission of submissions) {
    if (submission.verdict !== "OK") continue;
    const problemKey = `${submission.contestId}-${submission.problem.name}`;

    if (!visitedProblems.has(problemKey)) {
      visitedProblems.add(problemKey);
      visitedContests.add(submission.contestId);
      score += 10;
    }
  }

  const currentRating = profile[0]?.rating ?? 0;
  if (visitedContests.size >= 3 && currentRating >= 800) {
    score += Math.floor(Math.pow(currentRating - 800, 2) / 30);
  }

  return {
    score: score.toString(),
    problemCount: visitedProblems.size,
    contestCount: visitedContests.size,
    currentRating,
  };
}
