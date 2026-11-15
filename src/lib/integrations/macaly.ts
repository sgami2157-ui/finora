/**
 * Adapter Macaly Cloud.
 *
 * STATUS: belum terverifikasi. Tidak ada endpoint/SDK runtime Macaly yang dikonfirmasi untuk dipanggil
 * dari aplikasi ini, jadi TIDAK ada panggilan jaringan di sini dan status tidak pernah "connected".
 * Lihat docs/MACALY.md. Ganti implementasi `NotVerifiedMacaly` setelah API terverifikasi;
 * pemanggil hanya bergantung pada antarmuka `CloudProvider`.
 */
export type ProviderStatus = "not_verified" | "connected" | "error";

export interface CloudProvider {
  readonly name: string;
  status(): Promise<{ status: ProviderStatus; detail: string }>;
}

export class NotVerifiedMacaly implements CloudProvider {
  readonly name = "macaly_cloud";
  async status() {
    return {
      status: "not_verified" as const,
      detail: "Integrasi runtime Macaly Cloud belum diverifikasi; lihat docs/MACALY.md.",
    };
  }
}

export function getMacaly(): CloudProvider {
  return new NotVerifiedMacaly();
}
