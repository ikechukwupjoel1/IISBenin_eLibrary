import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    const { data: overdueRecords, error: fetchError } = await supabase
      .from('borrow_records')
      .select('id, due_date, book_id, student_id, staff_id')
      .eq('status', 'active')
      .lt('due_date', now);

    if (fetchError) {
      console.error('Error fetching overdue records:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch overdue records' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!overdueRecords || overdueRecords.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No overdue records found', count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const recordIds = overdueRecords.map((r) => r.id);

    const { error: updateError } = await supabase
      .from('borrow_records')
      .update({ status: 'overdue' })
      .in('id', recordIds);

    if (updateError) {
      console.error('Error updating overdue records:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update overdue records' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Updated ${recordIds.length} overdue borrow records`);

    return new Response(
      JSON.stringify({
        message: 'Overdue records updated successfully',
        count: recordIds.length,
        updated: recordIds,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});