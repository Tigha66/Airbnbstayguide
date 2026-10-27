"use client";
import { useState } from "react";
import { Plus, Trash2, Shield, Edit2, Check, X, Copy } from "lucide-react";
import type { WorkspaceMember, TeamRole } from "@stayguide/shared";

interface TeamMembersPanelProps {
  members: WorkspaceMember[];
  currentUserRole: TeamRole;
  onInvite: () => void;
  onRemove: (memberId: string) => void;
  onChangeRole: (memberId: string, role: TeamRole) => void;
  tr: (key: string, params?: Record<string, any>) => string;
}

const roleLabels: Record<TeamRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const roleDescriptions: Record<TeamRole, string> = {
  owner: "Full access • manage team • billing",
  editor: "Edit guides • add sections • manage extras",
  viewer: "View-only • no editing",
};

export function TeamMembersPanel({
  members,
  currentUserRole,
  onInvite,
  onRemove,
  onChangeRole,
  tr,
}: TeamMembersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<TeamRole>("editor");

  const canManageTeam = currentUserRole === "owner";
  const pendingMembers = members.filter((m) => m.status === "pending");
  const acceptedMembers = members.filter((m) => m.status === "accepted");

  function startEditRole(member: WorkspaceMember) {
    setEditingId(member.id);
    setEditRole(member.role);
  }

  function saveRole(memberId: string) {
    onChangeRole(memberId, editRole);
    setEditingId(null);
  }

  return (
    <div className="team-members-panel">
      <div className="panel-header">
        <h3>{tr("Team members")}</h3>
        {canManageTeam && (
          <button
            onClick={onInvite}
            className="button small"
            title={tr("Invite a team member")}
          >
            <Plus size={14} />
            {tr("Invite")}
          </button>
        )}
      </div>

      {/* Active Members */}
      {acceptedMembers.length > 0 && (
        <div className="members-section">
          <h4>{tr("Active ({n})", { n: acceptedMembers.length })}</h4>
          <div className="members-list">
            {acceptedMembers.map((member) => (
              <div key={member.id} className="member-item">
                <div className="member-info">
                  <div className="member-email">{member.email}</div>
                  <div className="member-joined">
                    {tr("Joined {date}", {
                      date: new Date(member.joinedAt || "").toLocaleDateString(),
                    })}
                  </div>
                </div>

                {editingId === member.id ? (
                  <div className="role-edit">
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as TeamRole)}
                      disabled={!canManageTeam}
                    >
                      {(["owner", "editor", "viewer"] as TeamRole[]).map((role) => (
                        <option key={role} value={role}>
                          {tr(roleLabels[role])}
                        </option>
                      ))}
                    </select>
                    {canManageTeam && (
                      <div className="edit-actions">
                        <button
                          onClick={() => saveRole(member.id)}
                          className="icon-button"
                          title={tr("Save")}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="icon-button"
                          title={tr("Cancel")}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="member-role">
                    <div className="role-badge">
                      <Shield size={12} />
                      {tr(roleLabels[member.role])}
                    </div>
                    <small className="role-description">
                      {tr(roleDescriptions[member.role])}
                    </small>
                    {canManageTeam && member.role !== "owner" && (
                      <div className="role-actions">
                        <button
                          onClick={() => startEditRole(member)}
                          className="icon-button"
                          title={tr("Change role")}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onRemove(member.id)}
                          className="icon-button delete"
                          title={tr("Remove member")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {pendingMembers.length > 0 && (
        <div className="members-section">
          <h4>{tr("Pending invitations ({n})", { n: pendingMembers.length })}</h4>
          <div className="members-list pending">
            {pendingMembers.map((member) => (
              <div key={member.id} className="member-item pending">
                <div className="member-info">
                  <div className="member-email">{member.email}</div>
                  <div className="member-joined">
                    {tr("Invited {date}", {
                      date: new Date(member.invitedAt).toLocaleDateString(),
                    })}
                  </div>
                </div>
                <div className="member-role">
                  <span className="status-badge">
                    {tr("Awaiting response")}
                  </span>
                  {canManageTeam && (
                    <button
                      onClick={() => onRemove(member.id)}
                      className="icon-button delete"
                      title={tr("Cancel invitation")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <div className="empty-state">
          <p>{tr("No team members yet")}</p>
          <small>{tr("Invite your team to collaborate on guides")}</small>
        </div>
      )}
    </div>
  );
}
