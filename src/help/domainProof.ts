export type DomainConstraint =
  | { type: 'equation'; equationIndex: number }
  | { type: 'inventory'; value: number };

export interface DomainChange { cellId: number; values: number[] }
export type DomainReduction = DomainConstraint & { changes: DomainChange[] };
export interface AssumptionRejection {
  type: 'exclude';
  cellId: number;
  value: number;
  reductions: DomainReduction[];
  contradiction: DomainConstraint;
}
export type DomainRule = 'propagation' | 'contradiction';
export interface DomainProof { steps: (DomainReduction | AssumptionRejection)[] }
