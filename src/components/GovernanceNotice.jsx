import Pressable from './Pressable';
import React from "react";
import { AlertTriangle, BookOpen } from "lucide-react";
import { effectiveRules, violationCount } from "../lib/governance";
export default function GovernanceNotice({ governance, onOpen }) {
  const snapshot = governance.snapshot;
  if (!snapshot) return null;
  const rule = effectiveRules(snapshot.rules);
  const unread =
    rule?.require_ack &&
    !snapshot.events.some(
      (e) =>
        e.action === "ack_rules" &&
        e.subject === snapshot.me.user_id &&
        e.data.ruleId === rule.id,
    );
  const count = violationCount(
    snapshot.events,
    snapshot.me.user_id,
    snapshot.team.policy,
    { start: snapshot.periodStart, end: snapshot.periodEnd },
  );
  if (!count && !unread) return null;
  return (
    <Pressable
      className="mx-4 mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left flex gap-3 items-center"
      onClick={onOpen}
    >
      {count ? (
        <AlertTriangle size={20} className="shrink-0" />
      ) : (
        <BookOpen size={20} className="shrink-0" />
      )}
      <span className="min-w-0 text-sm">
        {unread && (
          <span className="block">
            Nội quy bản {rule.version} cần xác nhận đã đọc.
          </span>
        )}
        {count > 0 && (
          <span className="block">
            Bạn có {count}/{snapshot.team.policy.threshold} vi phạm trong kỳ.{" "}
            {count >= snapshot.team.policy.threshold - 1
              ? "Gần hoặc đã đạt giới hạn."
              : "Xem lịch sử và điều chỉnh."}
          </span>
        )}
      </span>
    </Pressable>
  );
}
