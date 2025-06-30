export type ValidationResult = {
  valid: boolean;
  invalidFields: Array<string>;
};

export type PlatformScore = {
  score: string;
  problemCount: number;
  currentRating: number;
};

export type PlatformScores = {
  [key: string]: PlatformScore | null | number | Record<string, number>;
  totalScore: number;
  percentages: Record<string, number>;
};

type PlatformModule = {
  isHandleValid: (handle: string) => Promise<boolean>;
  getScore: (handle: string) => Promise<PlatformScore>;
};

const PLATFORMS = {
  github: 'github',
  codechef: 'codechef',
  codeforces: 'codeforces',
  hackerrank: 'hackerrank',
  interviewbit: 'interviewbit',
  leetcode: 'leetcode',
} as const;

type Platform = keyof typeof PLATFORMS;

export async function validatePlatformHandles(handles: Record<string, string>): Promise<ValidationResult> {
  const validationPromises = Object.entries(handles).map(async ([platform, handle]) => {
    if (!handle) return { platform, isValid: true };
    if (!(platform in PLATFORMS)) return { platform, isValid: false };
    const module = (await import(`./${platform as Platform}`)) as PlatformModule;
    const isValid = await module.isHandleValid(handle);
    return { platform, isValid };
  });

  const results = await Promise.all(validationPromises);
  const invalidHandles = results.filter((result) => !result.isValid).map((result) => result.platform);

  return {
    valid: invalidHandles.length === 0,
    invalidFields: invalidHandles,
  };
}

export async function getPlatformScores(handles: Record<string, string>): Promise<PlatformScores> {
  const scores = {
    totalScore: 0,
    percentages: {},
    ...Object.fromEntries(Object.keys(PLATFORMS).map((platform) => [platform, null])),
  } as PlatformScores;

  const scorePromises = Object.entries(handles).map(async ([platform, handle]) => {
    if (!handle) return;
    if (!(platform in PLATFORMS)) return;

    try {
      const { getScore } = (await import(`./${platform as Platform}`)) as PlatformModule;
      const score = await getScore(handle);
      scores[platform] = score;
      scores.totalScore += parseInt(score.score);
    } catch (error) {
      console.error(`Error fetching score for ${platform}:`, error);
      scores[platform] = null;
    }
  });

  await Promise.all(scorePromises);

  Object.entries(scores).forEach(([platform, score]) => {
    if (
      platform !== 'totalScore' &&
      platform !== 'percentages' &&
      score &&
      typeof score === 'object' &&
      'score' in score
    ) {
      const scoreValue = score.score;
      if (typeof scoreValue === 'string') {
        scores.percentages[platform] = Number(((parseInt(scoreValue) / scores.totalScore) * 100).toFixed(2));
      }
    }
  });

  return scores;
}
