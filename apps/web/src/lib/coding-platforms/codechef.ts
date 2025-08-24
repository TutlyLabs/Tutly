import * as cheerio from "cheerio";

const CODECHEF_API = "https://www.codechef.com/users/";

type CheerioAPI = ReturnType<typeof cheerio.load>;

const fetchProfile = async (handle: string): Promise<CheerioAPI> => {
  const response = await fetch(`${CODECHEF_API}${handle}`);
  const html = await response.text();
  return cheerio.load(html);
};

export async function isHandleValid(handle: string): Promise<boolean> {
  try {
    const $ = await fetchProfile(handle);
    return $(".user-profile-container").length > 0;
  } catch {
    return false;
  }
}

export async function getScore(handle: string) {
  try {
    const $ = await fetchProfile(handle);

    if ($(".user-profile-container").length === 0) {
      throw new Error("User not found");
    }

    const ratingElement = $(".rating-number");
    const problemsElement = $(".problems-solved h3:last-child");

    const ratingText = ratingElement.text().replace("?", "") || "0";
    const problemsText = problemsElement.text().split(" ").pop() ?? "0";
    const contests = $(".problems-solved .content").length;

    const rating = Number(ratingText);
    const totalProblemsSolved = Number(problemsText);
    let score = totalProblemsSolved * 10;

    if (contests >= 3) {
      score += Math.floor(Math.pow(rating - 1300, 2) / 30);
    }

    return {
      score: score.toString(),
      problemCount: totalProblemsSolved,
      currentRating: rating,
    };
  } catch {
    throw new Error("Failed to fetch score");
  }
}
