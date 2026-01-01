import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    // Only allow POST for initialization
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sql = neon(process.env.DATABASE_URL);

    try {
        // Create spending_snapshots table
        await sql`
      CREATE TABLE IF NOT EXISTS spending_snapshots (
        id SERIAL PRIMARY KEY,
        amount_spent NUMERIC NOT NULL,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

        // Create poll_votes table
        await sql`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id SERIAL PRIMARY KEY,
        vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
        voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

        res.status(200).json({ success: true, message: 'Database initialized' });
    } catch (error) {
        console.error('Database init error:', error);
        res.status(500).json({ error: 'Failed to initialize database' });
    }
}
