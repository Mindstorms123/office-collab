const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.documents = new Map();
    this.shareLinks = new Map();
  }

  createDocument(userId, type = 'docx') {
    const docId = uuidv4();
    this.documents.set(docId, {
      owner: userId,
      type,
      collaborators: new Set([userId]),
      createdAt: Date.now()
    });
    return docId;
  }

  createShareLink(docId, permission = 'edit') {
    const linkId = crypto.randomBytes(12).toString('hex');
    this.shareLinks.set(linkId, { docId, permission, createdAt: Date.now() });
    return linkId;
  }

  joinViaLink(linkId, userId) {
    const link = this.shareLinks.get(linkId);
    if (!link) return null;
    const doc = this.documents.get(link.docId);
    if (!doc) return null;
    doc.collaborators.add(userId);
    return { docId: link.docId, permission: link.permission, type: doc.type };
  }

  getDoc(docId) {
    return this.documents.get(docId) || null;
  }

  hasPermission(docId, userId) {
    const doc = this.documents.get(docId);
    if (!doc) return false;
    return doc.owner === userId || doc.collaborators.has(userId);
  }
}

module.exports = new SessionManager();
