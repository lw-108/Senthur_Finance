import { Customer } from './types';

export function customerRowToDomain(row: any): Customer {
  return {
    id: row.id,
    fullName: row.full_name,
    nickname: row.nickname || undefined,
    phone: row.phone,
    altPhone: row.alt_phone || undefined,
    email: row.email || undefined,
    whatsapp: row.whatsapp || undefined,
    photoUrl: row.photo_url || undefined,
    gender: row.gender || undefined,
    dob: row.dob || undefined,
    occupation: row.occupation || undefined,
    monthlyIncome: Number(row.monthly_income_paise || 0),
    address: row.address || { line1: '', city: '', state: '', pincode: '' },
    idProofs: Array.isArray(row.id_proofs) ? row.id_proofs : [],
    references: Array.isArray(row.customer_references) ? row.customer_references : [],
    guarantor: row.guarantor || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || undefined,
    rating: row.rating || undefined,
    creditScoreInternal: row.credit_score_internal || undefined,
    totals: row.totals || {
      activeLoans: 0,
      totalLent: 0,
      totalOutstanding: 0,
      totalPaid: 0,
      overdueAmount: 0,
    },
    status: row.status || 'Active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || '',
    isDeleted: Boolean(row.is_deleted),
  };
}

export function customerDomainToRow(c: Partial<Customer>, orgId: string, userId?: string | null): any {
  const row: Record<string, any> = {
    organization_id: orgId,
  };

  if (c.fullName !== undefined) row.full_name = c.fullName;
  if (c.nickname !== undefined) row.nickname = c.nickname;
  if (c.phone !== undefined) row.phone = c.phone;
  if (c.altPhone !== undefined) row.alt_phone = c.altPhone;
  if (c.email !== undefined) row.email = c.email;
  if (c.whatsapp !== undefined) row.whatsapp = c.whatsapp;
  if (c.photoUrl !== undefined) row.photo_url = c.photoUrl;
  if (c.gender !== undefined) row.gender = c.gender;
  if (c.dob !== undefined) row.dob = c.dob;
  if (c.occupation !== undefined) row.occupation = c.occupation;
  if (c.monthlyIncome !== undefined) row.monthly_income_paise = c.monthlyIncome;
  if (c.address !== undefined) row.address = c.address;
  if (c.idProofs !== undefined) row.id_proofs = c.idProofs;
  if (c.references !== undefined) row.customer_references = c.references;
  if (c.guarantor !== undefined) row.guarantor = c.guarantor;
  if (c.tags !== undefined) row.tags = c.tags;
  if (c.notes !== undefined) row.notes = c.notes;
  if (c.rating !== undefined) row.rating = c.rating;
  if (c.creditScoreInternal !== undefined) row.credit_score_internal = c.creditScoreInternal;
  if (c.totals !== undefined) row.totals = c.totals;
  if (c.status !== undefined) row.status = c.status;
  if (c.isDeleted !== undefined) row.is_deleted = c.isDeleted;
  if (userId) row.created_by = userId;

  return row;
}
