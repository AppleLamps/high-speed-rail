import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);

    // GET - Retrieve the latest spending snapshot
    if (req.method === 'GET') {
        try {
            const result = await sql`
        SELECT amount_spent, recorded_at 
        FROM spending_snapshots 
        ORDER BY recorded_at DESC 
        LIMIT 1
      `;

            if (result.length > 0) {
                res.status(200).json({
                    amountSpent: parseFloat(result[0].amount_spent),
                    recordedAt: result[0].recorded_at
                });
            } else {
                res.status(200).json({ amountSpent: null, recordedAt: null });
            }
        } catch (error) {
            console.error('Error fetching spending:', error);
            res.status(500).json({ error: 'Failed to fetch spending data' });
        }
        return;
    }

    // POST - Save a new spending snapshot
    if (req.method === 'POST') {
        try {
            const { amountSpent } = req.body;

            if (!amountSpent || typeof amountSpent !== 'number') {
                return res.status(400).json({ error: 'Invalid amountSpent value' });
            }

            await sql`
        INSERT INTO spending_snapshots (amount_spent)
        VALUES (${amountSpent})
      `;

            // Clean up old records, keep only last 100
            await sql`
        DELETE FROM spending_snapshots 
        WHERE id NOT IN (
          SELECT id FROM spending_snapshots 
          ORDER BY recorded_at DESC 
          LIMIT 100
        )
      `;

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error saving spending:', error);
            res.status(500).json({ error: 'Failed to save spending data' });
        }
        return;
    }

    res.status(405).json({ error: 'Method not allowed' });
}
