export interface PayCodeAllocation {
  payCodeName: string;
  hours: number;
  description: string;
}

export interface ShiftClassificationResult {
  employeeName: string;
  shiftStart: string; // ISO date string
  shiftEnd: string; // ISO date string
  payCodeAllocations: PayCodeAllocation[];
  totalHours: number;
}