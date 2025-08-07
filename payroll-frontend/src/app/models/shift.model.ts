export interface Shift {
  employeeName: string;
  startDateTime: string; // ISO date string
  endDateTime: string; // ISO date string
  organizationId: string;
}

export interface ShiftClassificationRequest {
  employeeName: string;
  startDateTime: string; // ISO date string
  endDateTime: string; // ISO date string
  organizationId: string;
}

export interface BatchShiftClassificationRequest {
  shifts: ShiftClassificationRequest[];
  organizationId: string;
}

export interface ShiftTestRequest {
  employeeName: string;
  startDateTime: string;
  endDateTime: string;
  organizationId: string;
}

export interface BulkShiftTestRequest {
  ruleId: string;
  shifts: ShiftTestRequest[];
  organizationId: string;
}