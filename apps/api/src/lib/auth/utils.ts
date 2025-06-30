export const generateRandomPassword = (length = 8) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)]; // 1 lowercase
  password += uppercase[Math.floor(Math.random() * uppercase.length)]; // 1 uppercase
  password += numbers[Math.floor(Math.random() * numbers.length)]; // 1 number
  password += symbols[Math.floor(Math.random() * symbols.length)]; // 1 symbol

  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};
