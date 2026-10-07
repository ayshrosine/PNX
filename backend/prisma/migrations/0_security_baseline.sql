-- ==========================================================
-- PNX PostgreSQL Security Baseline: RLS, Triggers, Views
-- ==========================================================

-- 1. Create app schema and current_tenant helper
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

-- 2. Next invoice numbering function
CREATE OR REPLACE FUNCTION next_invoice_number(p_series uuid) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  s invoice_series%ROWTYPE;
  n int;
BEGIN
  UPDATE invoice_series 
     SET "nextNumber" = "nextNumber" + 1
   WHERE id = p_series AND "tenantId" = app.current_tenant()
   RETURNING * INTO s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'series not found';
  END IF;

  n := s."nextNumber" - 1;
  RETURN s.prefix || s."fiscalYear" || '/' || lpad(n::text, s.padding, '0') || s.suffix;
END $$;

-- 3. Immutability trigger for issued invoices
CREATE OR REPLACE FUNCTION guard_issued_invoice() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'DRAFT' AND (
       NEW.total <> OLD.total OR NEW.subtotal <> OLD.subtotal OR NEW."taxTotal" <> OLD."taxTotal"
    OR NEW."clientId" <> OLD."clientId" OR NEW."issueDate" <> OLD."issueDate" OR NEW.number <> OLD.number
  ) THEN
    RAISE EXCEPTION 'Issued invoice % is immutable; issue a credit/debit note', OLD.number;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER trg_guard_issued_invoice 
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION guard_issued_invoice();

-- 4. Useful Views (security_invoker = true)
CREATE OR REPLACE VIEW v_invoice_ageing WITH (security_invoker = true) AS
SELECT i."tenantId", i.id, i."clientId", i.number, i."dueDate", i."balanceDue",
       GREATEST(0, (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - i."dueDate") AS days_overdue,
       CASE
         WHEN i."dueDate" >= CURRENT_DATE THEN 'CURRENT'
         WHEN CURRENT_DATE - i."dueDate" <= 15 THEN '1-15'
         WHEN CURRENT_DATE - i."dueDate" <= 30 THEN '16-30'
         WHEN CURRENT_DATE - i."dueDate" <= 45 THEN '31-45'
         WHEN CURRENT_DATE - i."dueDate" <= 60 THEN '46-60'
         ELSE '60+' END AS bucket
FROM invoices i
WHERE i.status IN ('SENT','PART_PAID') AND i."balanceDue" > 0;
