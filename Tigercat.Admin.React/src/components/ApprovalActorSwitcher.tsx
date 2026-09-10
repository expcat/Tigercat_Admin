import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from '@expcat/tigercat-react/Select';
import { Text } from '@expcat/tigercat-react/Text';
import {
  APPROVAL_DEMO_ACTOR_EVENT,
  FALLBACK_APPROVAL_CONTACTS,
  fetchApprovalContacts,
  getApprovalDemoActor,
  setApprovalDemoActor,
} from '../utils/approvals';
import type { ApprovalContactUser } from '../utils/types';

export function ApprovalActorSwitcher() {
  const [contacts, setContacts] = useState<ApprovalContactUser[]>(FALLBACK_APPROVAL_CONTACTS);
  const [actorId, setActorId] = useState(getApprovalDemoActor);

  const loadContacts = useCallback(async () => {
    try {
      const payload = await fetchApprovalContacts();
      if (payload.data.users?.length) setContacts(payload.data.users);
    } catch {
      setContacts(FALLBACK_APPROVAL_CONTACTS);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
    const sync = () => setActorId(getApprovalDemoActor());
    window.addEventListener(APPROVAL_DEMO_ACTOR_EVENT, sync);
    return () => window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, sync);
  }, [loadContacts]);

  const options = useMemo(
    () => contacts.map((user) => ({ value: user.id, label: `${user.name}（${user.username}）` })),
    [contacts],
  );

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Text size="sm" color="secondary">
        演示身份
      </Text>
      <Select
        value={actorId}
        options={options}
        aria-label="演示身份"
        className="min-w-[12rem]"
        onChange={(value) => {
          const next = String(value);
          setActorId(next);
          setApprovalDemoActor(next);
        }}
      />
    </div>
  );
}
