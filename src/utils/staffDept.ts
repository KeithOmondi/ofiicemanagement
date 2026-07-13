// src/utils/staffDept.ts

/**
 * Derives department-scoped feature flags for staff/viewer users from their
 * department name. Both DeptDeskGateway (routes) and StaffSidebar (nav items)
 * import this so the two stay in sync as more department-specific staff
 * features get added.
 */
export const getStaffDeptFlags = (departmentName: string | null | undefined) => {
  const slug = departmentName?.toLowerCase().trim() ?? '';

  return {
    isHelpdeskStaff: slug.includes('helpdesk') || slug.includes('help desk'),
    // Add more department-specific flags here as needed, e.g.:
    // isFinanceStaff: slug.includes('finance'),
    // isProcurementStaff: slug.includes('procurement'),
  };
};