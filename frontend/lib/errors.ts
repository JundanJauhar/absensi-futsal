const messages: Record<string, string> = {
  FACE_SERVICE_UNAVAILABLE: "Pengenalan wajah sedang tidak tersedia. Gunakan absensi manual.",
  VALIDATION_ERROR: "Periksa kembali data yang dimasukkan.",
  ALREADY_ATTENDED: "Pemain ini sudah tercatat hadir pada sesi tersebut.",
  UNAUTHORIZED: "Sesi login berakhir. Silakan masuk kembali.",
  NETWORK_ERROR: "Koneksi terputus. Periksa jaringan lalu coba lagi.",
};

export function getFriendlyError(code: string) {
  return messages[code] ?? "Terjadi kesalahan. Silakan coba lagi.";
}
