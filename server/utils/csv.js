const { stringify } = require('csv-stringify/sync');

const generateIssuesCSV = (issues) => {
  const rows = issues.map((i) => ({
    id: i._id.toString(),
    title: i.title,
    description: i.description?.replace(/\n/g, ' '),
    category: i.category?.name || '',
    priority: i.priority,
    status: i.status,
    ward: i.location?.ward || '',
    address: i.location?.address || '',
    latitude: i.location?.lat || '',
    longitude: i.location?.lng || '',
    upvotes: i.upvotes?.length || 0,
    assigned_to: i.assignedTo?.name || '',
    sla_deadline: i.slaDeadline ? new Date(i.slaDeadline).toISOString() : '',
    sla_breached: i.slaBreached ? 'Yes' : 'No',
    created_by: i.createdBy?.name || '',
    created_at: new Date(i.createdAt).toISOString(),
  }));

  return stringify(rows, { header: true });
};

module.exports = { generateIssuesCSV };
