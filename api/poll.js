import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);

    // GET - Retrieve poll counts
    if (req.method === 'GET') {
        try {
            const result = await sql`
        SELECT 
          vote_type,
          COUNT(*) as count
        FROM poll_votes
        GROUP BY vote_type
      `;

            const counts = { up: 0, down: 0 };
            result.forEach(row => {
                counts[row.vote_type] = parseInt(row.count);
            });

            res.status(200).json(counts);
        } catch (error) {
            console.error('Error fetching poll:', error);
            res.status(500).json({ error: 'Failed to fetch poll data' });
        }
        return;
    }

    // POST - Submit a vote
    if (req.method === 'POST') {
        try {
            const { voteType } = req.body;

            if (!voteType || !['up', 'down'].includes(voteType)) {
                return res.status(400).json({ error: 'Invalid vote type' });
            }

            await sql`
        INSERT INTO poll_votes (vote_type)
        VALUES (${voteType})
      `;

            // Get updated counts
            const result = await sql`
        SELECT 
          vote_type,
          COUNT(*) as count
        FROM poll_votes
        GROUP BY vote_type
      `;

            const counts = { up: 0, down: 0 };
            result.forEach(row => {
                counts[row.vote_type] = parseInt(row.count);
            });

            res.status(200).json(counts);
        } catch (error) {
            console.error('Error submitting vote:', error);
            res.status(500).json({ error: 'Failed to submit vote' });
        }
        return;
    }

    res.status(405).json({ error: 'Method not allowed' });
}
