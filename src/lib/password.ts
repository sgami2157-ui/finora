/** Kebijakan kata sandi (sisi klien; Supabase tetap memeriksa panjang minimum di server). */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Kata sandi minimal 10 karakter.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Gunakan huruf besar, huruf kecil, dan angka.";
  if (/^(.)\1+$/.test(pw) || /(password|katasandi|12345678|qwerty)/i.test(pw)) return "Kata sandi terlalu mudah ditebak.";
  return null;
}
