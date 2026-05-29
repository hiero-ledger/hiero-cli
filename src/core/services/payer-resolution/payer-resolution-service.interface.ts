export interface PayerResolutionService {
  resolvePayer(payerString: string): Promise<void>;
}
