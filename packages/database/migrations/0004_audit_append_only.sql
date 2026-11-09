-- The audit log is append-only. UPDATE is always refused; DELETE is refused unless the session
-- explicitly opts in (organisation deletion and the demo reset run with qm.allow_audit_purge=on).
CREATE OR REPLACE FUNCTION audit_events_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'audit_events is append-only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF coalesce(current_setting('qm.allow_audit_purge', true), '') <> 'on' THEN
    RAISE EXCEPTION 'audit_events rows cannot be deleted' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN OLD;
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();
