-- Migration 009: atualiza audit_trigger_function para ler app.user_ip
-- e gravar na coluna "ip" da tabela auditoria

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_email   VARCHAR;
  v_usuario_nome    VARCHAR;
  v_usuario_id      UUID;
  v_usuario_ip      VARCHAR;
  v_registro_id     UUID;
  v_valor_anterior  JSONB;
  v_valor_novo      JSONB;
  v_acao            VARCHAR;
  v_entidade        VARCHAR;
BEGIN
  v_usuario_email := COALESCE(current_setting('app.user_email', true), 'sistema');
  v_usuario_nome  := COALESCE(current_setting('app.user_nome',  true), v_usuario_email);
  v_usuario_ip    := current_setting('app.user_ip', true);

  BEGIN
    v_usuario_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_usuario_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    v_acao := 'CRIAR';
    v_valor_anterior := NULL;
    v_valor_novo := to_jsonb(NEW);
    BEGIN
      v_registro_id := (to_jsonb(NEW)->>'id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_registro_id := NULL;
    END;
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'EDITAR';
    v_valor_anterior := to_jsonb(OLD);
    v_valor_novo := to_jsonb(NEW);
    BEGIN
      v_registro_id := (to_jsonb(NEW)->>'id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_registro_id := NULL;
    END;
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'EXCLUIR';
    v_valor_anterior := to_jsonb(OLD);
    v_valor_novo := NULL;
    BEGIN
      v_registro_id := (to_jsonb(OLD)->>'id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_registro_id := NULL;
    END;
  ELSE
    RETURN NULL;
  END IF;

  v_entidade := TG_TABLE_NAME;

  IF v_valor_anterior ? 'senha_hash' THEN v_valor_anterior := v_valor_anterior - 'senha_hash'; END IF;
  IF v_valor_anterior ? 'senha'      THEN v_valor_anterior := v_valor_anterior - 'senha';      END IF;
  IF v_valor_anterior ? 'token'      THEN v_valor_anterior := v_valor_anterior - 'token';      END IF;
  IF v_valor_novo     ? 'senha_hash' THEN v_valor_novo     := v_valor_novo     - 'senha_hash'; END IF;
  IF v_valor_novo     ? 'senha'      THEN v_valor_novo     := v_valor_novo     - 'senha';      END IF;
  IF v_valor_novo     ? 'token'      THEN v_valor_novo     := v_valor_novo     - 'token';      END IF;

  BEGIN
    INSERT INTO auditoria (
      usuario_id, usuario_nome, usuario_email,
      acao, modulo, registro_id,
      valor_anterior, valor_novo,
      entidade, tabela, detalhes, ip
    ) VALUES (
      v_usuario_id, v_usuario_nome, v_usuario_email,
      v_acao, TG_TABLE_NAME, v_registro_id,
      v_valor_anterior, v_valor_novo,
      v_entidade, TG_TABLE_NAME, v_acao || ' em ' || TG_TABLE_NAME,
      NULLIF(v_usuario_ip, '')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Falha ao auditar % (%): %', TG_TABLE_NAME, TG_OP, SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
