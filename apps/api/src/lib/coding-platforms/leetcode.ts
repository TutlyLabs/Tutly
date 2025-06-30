const LEETCODE_API = 'https://leetcode.com/graphql';

type LeetCodeResponse = {
  data: {
    matchedUser: {
      username: string;
      submitStats: {
        acSubmissionNum: Array<{
          difficulty: string;
          count: number;
        }>;
      };
    } | null;
    userContestRanking: {
      attendedContestsCount: number;
      rating: number;
    } | null;
  };
};

const makeRequest = async (query: string, variables: Record<string, unknown>) => {
  const response = await fetch(LEETCODE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json() as Promise<LeetCodeResponse>;
};

export async function isHandleValid(handle: string): Promise<boolean> {
  const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) { username }
    }
  `;

  try {
    const { data } = await makeRequest(query, { username: handle });
    return data.matchedUser !== null;
  } catch {
    return false;
  }
}

export async function getScore(handle: string) {
  const query = `
    query userSessionProgress($username: String!) {
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
      }
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  try {
    const { data } = await makeRequest(query, { username: handle });

    if (!data.matchedUser) throw new Error('User not found');

    const problemsCount =
      data.matchedUser.submitStats.acSubmissionNum.find(
        (submission: { difficulty: string; count: number }) => submission.difficulty === 'All',
      )?.count ?? 0;

    const currentRating = data.userContestRanking?.rating ?? 0;
    let score = problemsCount * 50;

    const attendedContestsCount = data.userContestRanking?.attendedContestsCount ?? 0;
    if (attendedContestsCount >= 3) {
      score += Math.floor(Math.pow(currentRating - 1300, 2) / 30);
    }

    return {
      score: score.toString(),
      problemCount: problemsCount,
      currentRating,
    };
  } catch {
    throw new Error('Failed to fetch score');
  }
}
