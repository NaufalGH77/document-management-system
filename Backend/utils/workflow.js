const APPROVAL_STAGE = {
  SUPERVISOR: 'supervisor_review',
  MANAGER: 'manager_review',
};

const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  WAIT_FOR_FINALIZATION: 'wait_for_finalization',
  FINAL: 'final',
  REJECTED: 'rejected',
};

function getInitialApprovalStage(uploadedByRole) {
  return uploadedByRole === 'supervisor' ? APPROVAL_STAGE.MANAGER : APPROVAL_STAGE.SUPERVISOR;
}

function getNextApprovalStage(stage) {
  if (stage === APPROVAL_STAGE.SUPERVISOR) {
    return APPROVAL_STAGE.MANAGER;
  }

  return null;
}

function getApproverRoleForStage(stage) {
  if (stage === APPROVAL_STAGE.SUPERVISOR) {
    return 'supervisor';
  }

  if (stage === APPROVAL_STAGE.MANAGER) {
    return 'manager';
  }

  return null;
}

function getDocumentStatusForStage(stage) {
  if (stage === APPROVAL_STAGE.SUPERVISOR) {
    return DOCUMENT_STATUS.WAIT_FOR_FINALIZATION;
  }

  if (stage === APPROVAL_STAGE.MANAGER) {
    return DOCUMENT_STATUS.FINAL;
  }

  return DOCUMENT_STATUS.DRAFT;
}

module.exports = {
  APPROVAL_STAGE,
  DOCUMENT_STATUS,
  getApproverRoleForStage,
  getDocumentStatusForStage,
  getInitialApprovalStage,
  getNextApprovalStage,
};