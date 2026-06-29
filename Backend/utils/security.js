const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) {
    return false;
  }

  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    department: row.department,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidRole(role) {
  return ['admin', 'editor', 'reviewer', 'supervisor', 'manager', 'user', 'viewer'].includes(role);
}

function nextVersionLabel(currentVersion) {
  const match = /^v?(\d+)\.(\d+)$/.exec(currentVersion || '');

  if (!match) {
    return 'v1.1';
  }

  const major = Number.parseInt(match[1], 10);
  const minor = Number.parseInt(match[2], 10) + 1;
  return `v${major}.${minor}`;
}

module.exports = {
  createToken,
  hashPassword,
  hashToken,
  isValidRole,
  nextVersionLabel,
  sanitizeUser,
  verifyPassword,
};