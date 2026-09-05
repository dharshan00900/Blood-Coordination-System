const db = require('../db/database');

class CompatibilityService {
  /**
   * Get all compatible donor blood groups for a requested recipient blood group
   */
  getCompatibleDonorGroups(recipientGroup, componentType = 'WHOLE_BLOOD') {
    const rows = db.prepare(`
      SELECT donor_group FROM compatibility_rules 
      WHERE recipient_group = ? AND component_type = ? AND enabled = 1
    `).all(recipientGroup, componentType);

    return rows.map(r => r.donor_group);
  }

  /**
   * Check if a specific donor group is compatible with recipient group
   */
  isCompatible(donorGroup, recipientGroup, componentType = 'WHOLE_BLOOD') {
    const row = db.prepare(`
      SELECT enabled FROM compatibility_rules 
      WHERE donor_group = ? AND recipient_group = ? AND component_type = ?
    `).get(donorGroup, recipientGroup, componentType);

    return !!(row && row.enabled === 1);
  }

  /**
   * Get full compatibility matrix for Admin inspection and management
   */
  getAllRules() {
    return db.prepare('SELECT * FROM compatibility_rules ORDER BY recipient_group, donor_group').all();
  }

  /**
   * Toggle or update a rule
   */
  toggleRule(id, enabled) {
    db.prepare('UPDATE compatibility_rules SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    return db.prepare('SELECT * FROM compatibility_rules WHERE id = ?').get(id);
  }
}

module.exports = new CompatibilityService();
