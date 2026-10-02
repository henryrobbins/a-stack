import LabelBar from '@/components/primitives/LabelBar';
import Row from '@/components/primitives/Row';
import StructuredForm from '@/components/structured/StructuredForm';
import { formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

async function StructuredPage() {
  const supabase = await createClient();
  const { data: runs } = await supabase
    .from('structured_runs')
    .select('id, prompt, output, error, model, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <>
      <LabelBar>Structured output</LabelBar>
      <StructuredForm />
      <LabelBar aside={<span>{runs?.length ?? 0}</span>}>Past runs</LabelBar>
      {(runs ?? []).map((run) => (
        <Row
          key={run.id}
          title={run.prompt}
          subtitle={
            <span className="font-mono text-xs">
              {run.error ? `Error: ${run.error}` : JSON.stringify(run.output)}
            </span>
          }
          meta={formatDate(run.created_at)}
        />
      ))}
    </>
  );
}

export default StructuredPage;
