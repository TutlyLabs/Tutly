import { randomInt } from "crypto";

const generateRandomPassword = (length = 8) => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let password = "";
  password += lowercase[randomInt(lowercase.length)];
  password += uppercase[randomInt(uppercase.length)];
  password += numbers[randomInt(numbers.length)];
  password += symbols[randomInt(symbols.length)];

  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[randomInt(allChars.length)];
  }

  const arr = password.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.join("");
};

export default generateRandomPassword;
