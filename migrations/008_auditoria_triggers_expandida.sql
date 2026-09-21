DO $$
DECLARE
  tabelas TEXT[] := ARRAY[
    'perfis',
    'permissoes',
    'perfil_permissoes',
    'carretas',
    'categorias_financeiras',
    'centros_custo',
    'acoplamentos',
    'abastecimentos',
    'manutencoes',
    'documentos',
    'filiais',
    'empresas',
    'financeiro',
    'controle_km',
    'km_mensal',
    'fechamentos_periodo',
    'meses_fechados',
    'perfis_acesso'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I
         AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()',
      t, t
    );
    RAISE NOTICE 'Trigger criado: %', t;
  END LOOP;
END $$;
