const INTERVIEWBIT_API = 'https://www.interviewbit.com/v2/';

type ProblemsSolved = {
  course_problems_solved: Array<{
    total_user_score: number;
  }>;
  total_problems_solved: number;
};

const makeRequest = async <TResponse>(endpoint: string): Promise<TResponse> => {
  const response = await fetch(`${INTERVIEWBIT_API}${endpoint}`);
  const data = (await response.json()) as Record<string, unknown>;

  if (Object.keys(data).length === 0) {
    throw new Error('User not found');
  }

  return data as TResponse;
};

export async function isHandleValid(handle: string): Promise<boolean> {
  try {
    const data = await makeRequest<{ id: string }>(`profile/username?id=${handle}`);
    return Boolean(data.id);
  } catch {
    return false;
  }
}

export async function getScore(handle: string) {
  try {
    const problemsSolved = await makeRequest<ProblemsSolved>(
      `problem_list/problems_solved_overview_count?username=${handle}`,
    );
    let score = 0;

    for (const course of problemsSolved.course_problems_solved) {
      score += course.total_user_score;
    }

    score = Math.floor(score / 3);

    return {
      score: score.toString(),
      problemCount: problemsSolved.total_problems_solved,
      currentRating: score,
    };
  } catch {
    throw new Error('Failed to fetch score');
  }
}
